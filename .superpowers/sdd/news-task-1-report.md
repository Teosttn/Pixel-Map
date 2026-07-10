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
