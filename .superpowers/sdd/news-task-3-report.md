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
