# News Task 3 Report: Strict Bilingual Summarization and Digest Rendering

## Implementation Summary

- Added `scripts/news/openai.mjs` with `summarizeItems` and `validateSummaryOutput`.
- Added `scripts/news/digest.mjs` with `digestSlug` and `renderDigest`.
- Added `scripts/news/digest.test.mjs` covering strict model-output validation, explicit fallback policy, Responses API compatibility, immutable source metadata, frontmatter/body rendering, and the one-original-URL invariant.

`summarizeItems` posts to `/v1/responses` using the existing repository's request shape and supports both `output_text` and nested `output[].content[].text` extraction. It accepts only a directly parseable JSON array, validates the expected item count and all six required non-empty bilingual text fields, then merges only those six fields onto each original `FeedItem`. The model cannot replace `url`, `source`, `publishedAt`, `tags`, or `weight`.

An API key is required by default. `allowFallback: true` is the only path that permits source-summary fallback, including a missing key or failed request. The fallback produces all six required text fields and is intentionally opt-in for local development.

`renderDigest` emits the specified daily-digest frontmatter and a bilingual section per item with summaries, editorial notes, publication time, source, and one Markdown source link. Repeated occurrences of the item's original URL in model text are stripped at render time so the URL appears exactly once in the final Markdown.

## TDD Evidence

### RED 1: Missing modules

Before adding production modules, I created `scripts/news/digest.test.mjs` and ran:

```text
node --test scripts/news/digest.test.mjs
exit code 1
ERR_MODULE_NOT_FOUND: Cannot find module 'scripts/news/digest.mjs'
```

This failed for the intended reason: both Task 3 production modules did not yet exist.

### GREEN 1: Strict API and rendering contracts

After the minimum implementation, the focused suite passed:

```text
node --test scripts/news/digest.test.mjs
exit code 0; tests 5; pass 5; fail 0
```

The first GREEN run exposed one test-regex typo: unescaped Markdown square brackets made the assertion treat `Example` as a character class. The production output was correct; only the assertion was corrected before rerunning GREEN.

### RED 2: URL repeated by model text

During self-review, I added a regression in which `summaryEn` repeats the article URL, then ran:

```text
node --test --test-name-pattern="single source link" scripts/news/digest.test.mjs
exit code 1
actual URL occurrences: 2
expected URL occurrences: 1
```

### GREEN 2: Enforce the one-URL rendering invariant

After adding the render-boundary URL removal helper:

```text
node --test scripts/news/digest.test.mjs
exit code 0; tests 6; pass 6; fail 0
```

### RED 3: Non-boolean fallback flag

The requirement says fallback is allowed only when the flag is explicitly `true`. I added a missing-key call with `allowFallback: "true"` and ran:

```text
node --test --test-name-pattern="requires an API key" scripts/news/digest.test.mjs
exit code 1
AssertionError: Missing expected rejection
```

The prior truthiness check incorrectly accepted the string value.

### GREEN 3: Strict boolean fallback authorization

After changing the authorization predicate to `allowFallback === true`:

```text
node --test scripts/news/digest.test.mjs
exit code 0; tests 6; pass 6; fail 0
```

## Verification Commands and Results

```text
node --test scripts/news/digest.test.mjs
exit code 0; tests 6; pass 6; fail 0

npm run test:news
exit code 0; tests 15; pass 15; fail 0

node --check scripts/news/openai.mjs && node --check scripts/news/digest.mjs && node --check scripts/news/digest.test.mjs
exit code 0

git diff --cached --check
exit code 0
```

`npm run test:news` emitted the pre-existing `Unknown user config "python"` npm warning. It did not affect the zero exit code.

## Self-Review

- Confirmed default missing-key behavior is a thrown `OPENAI_API_KEY is required for news summarization` error; only the boolean `allowFallback: true` permits fallback.
- Confirmed the request target, authorization header, model selection, and response-text extraction match the existing legacy Responses API integration without adding an SDK.
- Confirmed malformed prose-wrapped JSON is rejected rather than extracted leniently.
- Confirmed malicious model metadata fields are discarded by the six-field merge whitelist.
- Confirmed frontmatter includes the design-specified type, bilingual titles and summaries, tags, publication state, item count, and unique sources.
- Confirmed every rendered item carries bilingual title, summary, editorial note, timestamp, source, and exactly one original URL in Markdown.
- Confirmed no Task 4 orchestration, routing, workflow, or legacy news-bot file was modified.

## Concerns

- The explicit fallback preserves the source language in `titleZh` or `summaryZh` when no translation service is available. This is intentional: it is opt-in local-development behavior and Task 4 must keep scheduled publication on the default strict path.

## Review Fix: Authenticated Failure and Markdown Hardening

This section supersedes the earlier statement that `allowFallback: true` could handle failed requests. Fallback is now limited to the missing-API-key branch. Once an API key is supplied, every request and response failure is propagated.

### Root Cause

- `summarizeItems` wrapped the entire authenticated Responses request in a `try/catch`; the catch returned fallback output whenever `allowFallback === true`, including network failures, non-OK responses, invalid JSON, missing output text, malformed summary JSON, and schema failures.
- `renderDigest` interpolated model title, summary, comment, and source strings directly into Markdown. Removing the original URL did not stop embedded newlines, headings, link syntax, or other control characters from changing document structure.
- Object spread preserved the original `tags` array reference, so modifying returned feed metadata could mutate caller-owned input.

### TDD RED

Added tests before changing production code for authenticated 503 responses, malformed model JSON, cloned `tags`, and malicious line breaks/Markdown controls. After correcting a test-only regex syntax error, ran:

```text
node --test scripts/news/digest.test.mjs
exit code 1; tests 10; pass 6; fail 4

authenticated 503 with allowFallback: true: Missing expected rejection
malformed JSON with allowFallback: true: Missing expected rejection
tags clone: input tags became ["tech", "mutated"]
malicious Markdown: 4 top-level ## headings found; expected 1
```

### Implementation

- Removed the authenticated-request catch/fallback path. Only a missing API key may return fallback output, and only when `allowFallback === true`.
- Cloned `tags` in both fallback and successful `FeedItem` output paths.
- Added a narrow `safeMarkdownText` render-boundary function: it removes only the matching original URL, folds CR/LF and repeated whitespace into one line, escapes Markdown control characters, and prevents plain `://` sequences from being auto-linked. It is applied to all model-controlled body text and the source-link label.
- Kept `sources` frontmatter values as JSON/YAML-safe serialized original strings; the malicious-source test parses the emitted array with `JSON.parse` to verify the dynamic value remains valid.

### TDD GREEN and Verification

```text
node --test scripts/news/digest.test.mjs
exit code 0; tests 10; pass 10; fail 0

npm run test:news
exit code 0; tests 19; pass 19; fail 0

node --check scripts/news/openai.mjs && node --check scripts/news/digest.mjs && node --check scripts/news/digest.test.mjs
exit code 0

git diff --check
exit code 0
```

`npm run test:news` continues to emit the pre-existing `Unknown user config "python"` warning; it does not affect the successful exit code.

### Review Self-Check

- Confirmed `allowFallback: true` with a 503 response and malformed model JSON both reject, rather than returning source fallback.
- Confirmed errors from `fetchImpl`, non-OK responses, `response.json()`, output extraction, JSON parsing, and schema validation are no longer caught by a fallback branch after authentication begins.
- Confirmed malicious headings cannot create additional item sections, source/title link delimiters are escaped, and summary/comment text is retained as readable single-line text rather than deleted.
- Confirmed the original item URL appears once in rendered Markdown and frontmatter dynamic source arrays remain JSON/YAML parseable.
- Confirmed returned `tags` can be mutated without mutating input metadata.
- No Task 4+ orchestration, content routing, or workflow files were changed.

### Follow-up RED/GREEN: Empty Input Still Requires a Key

Self-review found that the former early `items.length === 0` return preceded API-key validation. This contradicted the strict missing-key contract even though Task 4 can independently short-circuit a no-news run.

```text
RED: node --test --test-name-pattern="requires an API key" scripts/news/digest.test.mjs
exit code 1
AssertionError: Missing expected rejection for summarizeItems([], {})

GREEN: node --test scripts/news/digest.test.mjs
exit code 0; tests 10; pass 10; fail 0
```

The key check now runs before the empty-input return. Authenticated empty input still returns an empty array without an unnecessary API call.
