# News Task 1 Report

## Implementation Summary

Implemented the pure news domain module for Shanghai-local dates, URL canonicalization, title normalization, freshness filtering, ranking, and near-duplicate selection.

The ranking contract is preserved: after freshness filtering, items are scored by `weight + keyword relevance + freshness`; ties are resolved by newer `publishedAt` first before URL/title duplicate filtering.

The plan example originally expected `https://example.com/a`, although its supplied implementation ranks the newer equal-weight, equally relevant item `https://example.com/b` first. Per clarification, the test expectation was corrected to `https://example.com/b`; the implementation was not changed to contradict the ranking contract.

## Files

- `scripts/news/domain.mjs`: domain functions `shanghaiDate`, `canonicalUrl`, `normalizeTitle`, and `selectFreshItems`.
- `scripts/news/domain.test.mjs`: date, canonical URL, freshness, ranking, and near-duplicate coverage.
- `package.json`: `test:news` now runs `node --test scripts/news/*.test.mjs`.

## Test Commands and Results

- `node --test scripts/news/domain.test.mjs`: PASS, 3 tests passed, 0 failed.
- `npm run test:news`: PASS, 3 tests passed, 0 failed.
- `git diff --check -- package.json && node --check scripts/news/domain.mjs && node --check scripts/news/domain.test.mjs`: PASS, exit code 0.

`npm run test:news` emits the existing npm warning `Unknown user config "python"`; it does not affect the successful exit code or test results.

## TDD Evidence

### RED

Added `scripts/news/domain.test.mjs` before the production module and ran:

```text
node --test scripts/news/domain.test.mjs
```

Result: exit code 1 with `ERR_MODULE_NOT_FOUND` for `scripts/news/domain.mjs`, confirming the test failed because the feature was missing.

### GREEN

Added the minimal domain implementation and ran the test. The first run exposed the plan-example ranking inconsistency: implementation output was `https://example.com/b`, while the original example expected `https://example.com/a`.

After the clarified contract was applied by updating the test expectation to `https://example.com/b`:

- `node --test scripts/news/domain.test.mjs`: 3/3 passed.
- `npm run test:news`: 3/3 passed.

## Self-Review

- Confirmed Shanghai date conversion crosses the UTC boundary as required.
- Confirmed tracking query parameters and URL hash are removed, remaining query parameters are sorted, and trailing non-root slashes are removed.
- Confirmed stale, invalid, and more-than-15-minute-future records are excluded.
- Confirmed ranking happens before near-duplicate filtering, with newer `publishedAt` winning the clarified equal-score example.
- Confirmed canonical URLs and normalized titles are used for duplicate filtering, and `seenUrls` is honored.
- Confirmed `maxItems` is applied after filtering and ranking.
- Confirmed only the task implementation files, package script, and required report were changed.

## Concerns

- The domain functions intentionally rely on the required option shape and valid URL inputs; defensive validation was not added because it is outside this task's contract.
- The npm `python` user-config warning is environmental and pre-existing; it is non-blocking.

## Review Fixes

This section supersedes the original `test:news` command description and 3-test result above.

### Fix Details

- Restored the legacy `scripts/check-news-bot.mjs` validation ahead of the new Node test glob. The package command is now `node scripts/check-news-bot.mjs && node --test scripts/news/*.test.mjs`.
- Replaced lexical `publishedAt` tie-breaking with subtraction of parsed epoch milliseconds, so legal ISO timestamps with different offsets are ordered chronologically.
- Added an equal-score tie-break regression using `2026-07-10T23:30:00+08:00` and `2026-07-10T10:00:00-06:00`. With a four-hour freshness window and weights `1.125` and `1`, both scores are exactly `1.75`; the chronologically newer `-06:00` item must rank first.
- Changed the weight default from `item.weight || 1` to `item.weight ?? 1`, preserving an explicit `weight: 0` while retaining the default for `null` or `undefined`.

### TDD RED/GREEN Evidence

Legacy validation contract:

```text
RED: node --test --test-name-pattern="test:news retains legacy validation" scripts/news/domain.test.mjs
exit code 1
actual:   node --test scripts/news/*.test.mjs
expected: node scripts/check-news-bot.mjs && node --test scripts/news/*.test.mjs

GREEN: node --test --test-name-pattern="test:news retains legacy validation" scripts/news/domain.test.mjs
exit code 0; tests 1; pass 1; fail 0
```

Chronological equal-score tie-break:

```text
RED: node --test --test-name-pattern="equal-score ties" scripts/news/domain.test.mjs
exit code 1
actual order:   [https://example.com/older, https://example.com/newer]
expected order: [https://example.com/newer, https://example.com/older]

GREEN: node --test --test-name-pattern="equal-score ties" scripts/news/domain.test.mjs
exit code 0; tests 1; pass 1; fail 0
```

Explicit zero weight:

```text
RED: node --test --test-name-pattern="explicit zero weight" scripts/news/domain.test.mjs
exit code 1
actual score: 2
expected score: 1

GREEN: node --test --test-name-pattern="explicit zero weight" scripts/news/domain.test.mjs
exit code 0; tests 1; pass 1; fail 0
```

### Final Verification

```text
node --test scripts/news/domain.test.mjs
exit code 0; tests 6; pass 6; fail 0

npm run test:news
executed: node scripts/check-news-bot.mjs && node --test scripts/news/*.test.mjs
exit code 0; tests 6; pass 6; fail 0
```

The full npm command still emits the pre-existing `Unknown user config "python"` warning. The legacy validator itself completes successfully without additional output.

### Review Self-Check and Concerns

- `node --check scripts/news/domain.mjs` and `node --check scripts/news/domain.test.mjs`: PASS.
- `git diff --check`: PASS.
- Task 4 must update or remove the temporary package-script contract test when it deletes `scripts/check-news-bot.mjs`; until then, the test prevents accidental loss of legacy validation.
