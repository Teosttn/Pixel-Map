# Daily News Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one idempotent bilingual technical-news digest per Asia/Shanghai day through a resilient GitHub Actions workflow.

**Architecture:** Split the existing monolithic news script into feed, selection, summarization, digest, and orchestration modules with dependency-injected network boundaries. Store one Markdown digest per day, render it through the existing Markdown engine, and deploy changed content in the same Actions run.

**Tech Stack:** Node.js 20 ESM, built-in `node:test`, OpenAI Responses API, Next.js 14 static export, GitHub Actions, Markdown.

## Global Constraints

- Keep GitHub Pages as the only production host.
- Keep content in Git-tracked Markdown and JSON files.
- Publish at most one digest for each Asia/Shanghai calendar date.
- Target 08:30 Asia/Shanghai with a second catch-up trigger at 09:10.
- Every published item must include an original source URL.
- Scheduled production runs require `OPENAI_API_KEY` from GitHub Actions Secrets.
- A failed run must not partially mutate digest or seen-state files.
- Preserve migrated legacy posts, Markdown code blocks, and legacy images.

---

### Task 1: News Domain, Date, Freshness, and Selection

**Files:**
- Create: `scripts/news/domain.mjs`
- Create: `scripts/news/domain.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `shanghaiDate(now): string`
- Produces: `canonicalUrl(url): string`
- Produces: `normalizeTitle(title): string`
- Produces: `selectFreshItems(items, options): FeedItem[]`
- `FeedItem`: `{ title, url, summary, publishedAt, source, tags, weight }`

- [ ] **Step 1: Write failing domain tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, selectFreshItems, shanghaiDate } from "./domain.mjs";

test("shanghaiDate crosses the UTC day boundary", () => {
  assert.equal(shanghaiDate(new Date("2026-07-09T16:30:00Z")), "2026-07-10");
});

test("canonicalUrl removes tracking parameters and hash", () => {
  assert.equal(
    canonicalUrl("https://example.com/post/?utm_source=rss&id=7#top"),
    "https://example.com/post?id=7"
  );
});

test("selectFreshItems rejects stale and near-duplicate records", () => {
  const items = [
    { title: "AI SDK 7", url: "https://example.com/a", summary: "AI", publishedAt: "2026-07-10T00:00:00Z", source: "A", tags: ["AI"], weight: 1 },
    { title: "AI SDK 7 is now available", url: "https://example.com/b", summary: "AI", publishedAt: "2026-07-10T00:05:00Z", source: "B", tags: ["AI"], weight: 1 },
    { title: "Old release", url: "https://example.com/c", summary: "old", publishedAt: "2026-07-01T00:00:00Z", source: "C", tags: [], weight: 1 }
  ];
  const selected = selectFreshItems(items, {
    now: new Date("2026-07-10T01:00:00Z"),
    maxAgeHours: 72,
    maxItems: 8,
    seenUrls: new Set(),
    topicKeywords: ["AI"]
  });
  assert.deepEqual(selected.map((item) => item.url), ["https://example.com/a"]);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/news/domain.test.mjs`

Expected: FAIL because `scripts/news/domain.mjs` does not exist.

- [ ] **Step 3: Implement the domain module**

```js
const TRACKING_KEYS = new Set(["fbclid", "gclid", "ref", "source", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"]);

export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function canonicalUrl(value) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_KEYS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  url.searchParams.sort();
  return url.toString().replace(/\?$/, "");
}

export function normalizeTitle(value) {
  return String(value).toLowerCase()
    .replace(/\b(is )?now available\b|\breleased\b|\bintroducing\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").replace(/\s+/g, " ").trim();
}

export function selectFreshItems(items, options) {
  const minimum = options.now.getTime() - options.maxAgeHours * 60 * 60 * 1000;
  const urls = new Set();
  const titles = new Set();
  return items
    .filter((item) => {
      const timestamp = new Date(item.publishedAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= minimum && timestamp <= options.now.getTime() + 15 * 60 * 1000;
    })
    .map((item) => {
      const url = canonicalUrl(item.url);
      const keywordScore = options.topicKeywords.filter((keyword) => `${item.title} ${item.summary}`.toLowerCase().includes(keyword.toLowerCase())).length;
      const freshness = Math.max(0, 1 - (options.now.getTime() - new Date(item.publishedAt).getTime()) / (options.maxAgeHours * 60 * 60 * 1000));
      return { ...item, url, score: Number(item.weight || 1) + keywordScore + freshness };
    })
    .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
    .filter((item) => {
      const title = normalizeTitle(item.title);
      if (options.seenUrls.has(item.url.toLowerCase()) || urls.has(item.url) || titles.has(title)) return false;
      urls.add(item.url);
      titles.add(title);
      return true;
    })
    .slice(0, options.maxItems);
}
```

- [ ] **Step 4: Add the test command and verify GREEN**

Add to `package.json`:

```json
"test:news": "node --test scripts/news/*.test.mjs"
```

Run: `npm run test:news`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/news/domain.mjs scripts/news/domain.test.mjs
git commit -m "test: define daily news selection rules"
```

### Task 2: Feed Parsing and Resilient Fetching

**Files:**
- Create: `scripts/news/feed.mjs`
- Create: `scripts/news/feed.test.mjs`

**Interfaces:**
- Consumes: `FeedItem` from Task 1.
- Produces: `parseFeed(xml, source, now): FeedItem[]`
- Produces: `fetchSources(sources, { fetchImpl, now, attempts, timeoutMs }): Promise<{ items, failures }>`

- [ ] **Step 1: Write failing parser and retry tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fetchSources, parseFeed } from "./feed.mjs";

test("parseFeed preserves source publication timestamps and links", () => {
  const xml = `<rss><channel><item><title>Release</title><link>https://example.com/release</link><description>Details</description><pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
  const items = parseFeed(xml, { name: "Example", url: "https://example.com/rss", tags: ["tech"], weight: 1 }, new Date("2026-07-10T01:00:00Z"));
  assert.deepEqual(items[0], {
    title: "Release", url: "https://example.com/release", summary: "Details",
    publishedAt: "2026-07-10T00:00:00.000Z", source: "Example", tags: ["tech"], weight: 1
  });
});

test("fetchSources retries one source and reports a permanently failed source", async () => {
  const calls = new Map();
  const fetchImpl = async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (url.endsWith("bad")) throw new Error("offline");
    if (calls.get(url) === 1) throw new Error("temporary");
    return new Response(`<rss><channel><item><title>OK</title><link>https://example.com/a</link><pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
  };
  const result = await fetchSources([{ name: "Good", url: "https://feed/good" }, { name: "Bad", url: "https://feed/bad" }], { fetchImpl, now: new Date("2026-07-10T01:00:00Z"), attempts: 2, timeoutMs: 50 });
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.failures.map((failure) => failure.source), ["Bad"]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/news/feed.test.mjs`

Expected: FAIL because `feed.mjs` does not exist.

- [ ] **Step 3: Implement parser helpers and `Promise.allSettled` fetching**

Implement `parseFeed` with the existing RSS/Atom tag support, preserving full ISO timestamps. Implement `fetchSources` so each source uses `AbortSignal.timeout(timeoutMs)`, retries exactly `attempts`, and returns `{ source, message }` failures instead of hiding them. Throw only in the orchestrator when every configured source fails.

```js
export async function fetchSources(sources, options) {
  const results = await Promise.allSettled(sources.map(async (source) => {
    let error;
    for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
      try {
        const response = await options.fetchImpl(source.url, {
          headers: { "user-agent": "Pixel-Map-NewsBot/2.0 (+https://github.com/Teosttn/Pixel-Map)" },
          signal: AbortSignal.timeout(options.timeoutMs)
        });
        if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
        return parseFeed(await response.text(), source, options.now);
      } catch (caught) {
        error = caught;
      }
    }
    throw new Error(error instanceof Error ? error.message : String(error));
  }));
  return results.reduce((output, result, index) => {
    if (result.status === "fulfilled") output.items.push(...result.value);
    else output.failures.push({ source: sources[index].name, message: result.reason.message });
    return output;
  }, { items: [], failures: [] });
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:news`

Expected: PASS.

```bash
git add scripts/news/feed.mjs scripts/news/feed.test.mjs
git commit -m "feat: fetch news sources with bounded retries"
```

### Task 3: Strict Bilingual Summarization and Digest Rendering

**Files:**
- Create: `scripts/news/openai.mjs`
- Create: `scripts/news/digest.mjs`
- Create: `scripts/news/digest.test.mjs`

**Interfaces:**
- Produces: `summarizeItems(items, { apiKey, model, fetchImpl }): Promise<DigestItem[]>`
- Produces: `renderDigest({ date, items }): string`
- Produces: `digestSlug(date): string`
- `DigestItem` extends `FeedItem` with `titleZh`, `titleEn`, `summaryZh`, `summaryEn`, `commentZh`, `commentEn`.

- [ ] **Step 1: Write failing strict-output and original-link tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { renderDigest } from "./digest.mjs";
import { validateSummaryOutput } from "./openai.mjs";

const item = {
  title: "Release", titleZh: "发布", titleEn: "Release", summaryZh: "中文摘要", summaryEn: "English summary",
  commentZh: "中文短评", commentEn: "English note", url: "https://example.com/release",
  publishedAt: "2026-07-10T00:00:00.000Z", source: "Example", tags: ["tech"], weight: 1
};

test("validateSummaryOutput rejects missing records", () => {
  assert.throws(() => validateSummaryOutput([], 1), /expected 1 items/);
});

test("renderDigest creates one article with an original link per item", () => {
  const markdown = renderDigest({ date: "2026-07-10", items: [item] });
  assert.match(markdown, /type: "daily-digest"/);
  assert.match(markdown, /itemCount: 1/);
  assert.match(markdown, /\[Example\]\(https:\/\/example\.com\/release\)/);
  assert.equal((markdown.match(/https:\/\/example\.com\/release/g) || []).length, 1);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/news/digest.test.mjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict validation and rendering**

`summarizeItems` must reject an absent key unless `allowFallback` is explicitly true, call `/v1/responses`, parse one JSON array, validate exact length and six bilingual string fields, then merge only text fields back into immutable source metadata.

```js
const REQUIRED = ["titleZh", "titleEn", "summaryZh", "summaryEn", "commentZh", "commentEn"];

export function validateSummaryOutput(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`OpenAI summary expected ${expectedLength} items`);
  }
  value.forEach((item, index) => REQUIRED.forEach((key) => {
    if (typeof item[key] !== "string" || !item[key].trim()) throw new Error(`OpenAI item ${index} missing ${key}`);
  }));
  return value;
}
```

`renderDigest` writes the frontmatter defined in the design spec and one `## N. titleZh / titleEn` section per item, followed by both summaries, both comments, publication metadata, and exactly one Markdown source link.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:news`

Expected: PASS.

```bash
git add scripts/news/openai.mjs scripts/news/digest.mjs scripts/news/digest.test.mjs
git commit -m "feat: render strict bilingual daily digests"
```

### Task 4: Atomic Orchestration and Daily Idempotency

**Files:**
- Create: `scripts/news/run.mjs`
- Create: `scripts/news/run.test.mjs`
- Modify: `scripts/fetch-news.mjs`
- Delete: `scripts/news-bot.mjs`
- Delete: `scripts/check-news-bot.mjs`
- Modify: `src/content/config/news-sources.json`
- Modify: `src/content/config/news-seen.json`

**Interfaces:**
- Consumes: Tasks 1-3 modules.
- Produces: `runDailyDigest(options): Promise<{ status, date, path, fetchedCount, selectedCount, failures }>`.
- Status values: `published`, `already-published`, `no-fresh-items`.

- [ ] **Step 1: Write a failing filesystem idempotency test using a temporary fixture**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDailyDigest } from "./run.mjs";

test("runDailyDigest publishes once and makes the catch-up run a no-op", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-map-news-"));
  const dependencies = {
    now: new Date("2026-07-10T00:30:00Z"),
    fetchSources: async () => ({ items: [{ title: "Release", url: "https://example.com/a", summary: "Details", publishedAt: "2026-07-10T00:00:00Z", source: "Example", tags: ["tech"], weight: 1 }], failures: [] }),
    summarizeItems: async (items) => items.map((item) => ({ ...item, titleZh: "发布", titleEn: "Release", summaryZh: "摘要", summaryEn: "Summary", commentZh: "短评", commentEn: "Note" }))
  };
  const first = await runDailyDigest({ root, config: { maxItemsPerDigest: 8, maxAgeHours: 72, topicKeywords: [], sources: [{}] }, state: { urls: [] }, dependencies });
  const second = await runDailyDigest({ root, config: { maxItemsPerDigest: 8, maxAgeHours: 72, topicKeywords: [], sources: [{}] }, dependencies });
  assert.equal(first.status, "published");
  assert.equal(second.status, "already-published");
  assert.equal(JSON.parse(await readFile(join(root, "config/news-seen.json"), "utf8")).lastPublishedDate, "2026-07-10");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test scripts/news/run.test.mjs`

Expected: FAIL because `run.mjs` does not exist.

- [ ] **Step 3: Implement orchestration with temporary files and rename**

Write the digest to `<path>.tmp`, write state to `news-seen.json.tmp`, then rename the digest first and state second only after both serialized values are ready. Remove temporary files in `catch`. If every source fails, throw. If no fresh items remain, return `no-fresh-items` without writing.

Update `fetch-news.mjs` to parse `--force` and `--allow-source-fallback`, call `runDailyDigest`, print one machine-readable summary, and append `changed=true|false` and `digest_path=...` to `GITHUB_OUTPUT` when present.

- [ ] **Step 4: Update configuration and verify GREEN**

Add `maxItemsPerDigest: 8`, `maxAgeHours: 72`, `fetchAttempts: 2`, and `fetchTimeoutMs: 10000` to `news-sources.json`. Add `lastPublishedDate` to `news-seen.json` without deleting existing URLs.

Run: `npm run test:news`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/fetch-news.mjs scripts/news src/content/config/news-sources.json src/content/config/news-seen.json
git rm scripts/news-bot.mjs scripts/check-news-bot.mjs
git commit -m "feat: publish idempotent daily news digests"
```

### Task 5: Public Digest Model, Routes, and Content Migration

**Files:**
- Modify: `src/lib/content.ts`
- Modify: `src/app/news/page.tsx`
- Create: `src/app/news/[slug]/page.tsx`
- Create: `scripts/migrate-news-to-digests.mjs`
- Create: `scripts/check-news-content.mjs`
- Modify: `package.json`
- Modify: `src/app/sitemap.xml/route.ts`
- Modify: `src/app/rss.xml/route.ts`
- Modify: `src/content/news/*.md`

**Interfaces:**
- Produces: `NewsDigest` with `{ type, slug, title, titleZh, titleEn, date, summaryZh, summaryEn, tags, published, itemCount, sources, body }`.
- Produces: `getNewsDigests(): NewsDigest[]` and `getNewsDigest(slug): NewsDigest | undefined`.

- [ ] **Step 1: Write a failing content/build assertion**

Create `scripts/check-news-content.mjs`:

```js
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync(join(process.cwd(), "src/content/news")).filter((name) => name.endsWith(".md"));
assert.ok(files.length > 0);
for (const file of files) {
  const source = readFileSync(join(process.cwd(), "src/content/news", file), "utf8");
  assert.match(source, /^type: "daily-digest"$/m, `${file} must be a digest`);
  assert.match(source, /https:\/\//, `${file} must retain original links`);
}
```

Add `"test:content": "node scripts/check-news-content.mjs"` and run it.

Expected: FAIL because existing files are single-item records.

- [ ] **Step 2: Add `NewsDigest` readers and detail route**

Replace `NewsItem` readers with `NewsDigest`, add `getNewsDigest`, and export `parseFrontmatter` for the local admin only through a server-safe helper in the later admin plan. The detail route must use `generateStaticParams`, `generateMetadata`, `notFound`, `markdownToHtml`, and a `.prose` article body.

```tsx
export function generateStaticParams() {
  return getNewsDigests().map(({ slug }) => ({ slug }));
}

export default function NewsDigestPage({ params }: { params: { slug: string } }) {
  const digest = getNewsDigest(params.slug);
  if (!digest) notFound();
  return <main className="page page--narrow"><article className="prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(digest.body) }} /></main>;
}
```

- [ ] **Step 3: Update index, sitemap, and RSS**

The news index links each card to `/news/${digest.slug}` and shows digest date, item count, sources, bilingual summaries, and tags. Sitemap and RSS include digest detail URLs rather than external item URLs.

- [ ] **Step 4: Migrate current content by date**

Run: `node scripts/migrate-news-to-digests.mjs`

Expected: six current news records become three date-grouped digest files, with every original URL retained in the corresponding Markdown body. Inspect each generated file before deleting old files.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:content`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all PASS and digest routes appear in build output.

```bash
git add package.json scripts/migrate-news-to-digests.mjs scripts/check-news-content.mjs src/lib/content.ts src/app/news src/app/sitemap.xml/route.ts src/app/rss.xml/route.ts src/content/news
git commit -m "feat: present news as daily digest articles"
```

### Task 6: Resilient Scheduled Workflow and Deployment Separation

**Files:**
- Modify: `.github/workflows/daily-news.yml`
- Modify: `.github/workflows/nextjs.yml`
- Create: `scripts/check-workflows.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `fetch-news.mjs` outputs `changed` and `digest_path`.
- Produces: one generation/build job and one serialized Pages deploy job.

- [ ] **Step 1: Write a failing workflow contract test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const daily = readFileSync(".github/workflows/daily-news.yml", "utf8");
const pages = readFileSync(".github/workflows/nextjs.yml", "utf8");
assert.match(daily, /cron: "30 0 \* \* \*"/);
assert.match(daily, /cron: "10 1 \* \* \*"/);
assert.match(daily, /group: daily-news/);
assert.match(daily, /OPENAI_API_KEY: \$\{\{ secrets\.OPENAI_API_KEY \}\}/);
assert.match(daily, /needs: generate/);
assert.match(daily, /group: pages/);
assert.match(pages, /actions\/upload-pages-artifact@v4/);
```

Add `"test:workflows": "node scripts/check-workflows.mjs"` and run it.

Expected: FAIL because the catch-up cron and job-level concurrency are absent and Pages still requires the public admin artifact.

- [ ] **Step 2: Refactor `daily-news.yml`**

Create a `generate` job with `concurrency.group: daily-news`, a 20-minute timeout, checkout, Node setup, `npm ci`, strict news fetch, tests, typecheck, build, commit/push, and Pages artifact upload when changed. Create a `deploy` job with `needs: generate`, `if: needs.generate.outputs.changed == 'true'`, `concurrency.group: pages`, Pages environment, and `actions/deploy-pages@v5`.

- [ ] **Step 3: Narrow normal Pages concurrency**

Move `pages` concurrency from workflow level to the `deploy` job in `nextjs.yml` and keep builds parallel. The local-admin plan owns removal of the public admin route and changes artifact verification only after that route has been removed.

- [ ] **Step 4: Verify all news contracts**

Run: `npm run test:news`

Run: `npm run test:content`

Run: `npm run test:workflows`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/check-workflows.mjs .github/workflows/daily-news.yml .github/workflows/nextjs.yml
git commit -m "ci: make daily news publishing recoverable"
```
