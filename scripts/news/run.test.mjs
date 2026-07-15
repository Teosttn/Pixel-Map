import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArguments, writeGithubOutput, writeGithubStepSummary } from "../fetch-news.mjs";
import { runDailyDigest } from "./run.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "pixel-map-news-"));
  await Promise.all([
    writeFile(join(root, "config-placeholder"), "", "utf8"),
    writeFile(join(root, "news-placeholder"), "", "utf8")
  ]);
  return root;
}

const config = {
  maxItemsPerDigest: 8,
  maxAgeHours: 72,
  fetchAttempts: 2,
  fetchTimeoutMs: 10_000,
  topicKeywords: [],
  sources: [{ name: "Example", url: "https://example.com/feed" }]
};

const item = {
  title: "Release",
  url: "https://example.com/a",
  summary: "Details",
  publishedAt: "2026-07-10T00:00:00.000Z",
  source: "Example",
  tags: ["tech"],
  weight: 1
};

const summarizedItem = {
  titleZh: "发布",
  titleEn: "Release",
  summaryZh: "摘要",
  summaryEn: "Summary",
  commentZh: "短评",
  commentEn: "Note"
};

test("runDailyDigest publishes once and makes the Shanghai catch-up run a no-op", async () => {
  const root = await createFixture();
  const dependencies = {
    now: new Date("2026-07-10T00:30:00Z"),
    fetchSources: async () => ({ items: [item], failures: [] }),
    summarizeItems: async (items) => items.map((entry) => ({ ...entry, ...summarizedItem }))
  };

  const first = await runDailyDigest({ root, config, state: { urls: ["https://history.example/kept"] }, dependencies });
  const second = await runDailyDigest({ root, config, dependencies });
  const state = JSON.parse(await readFile(join(root, "config", "news-seen.json"), "utf8"));

  assert.equal(first.status, "published");
  assert.equal(second.status, "already-published");
  assert.equal(first.date, "2026-07-10");
  assert.equal(state.lastPublishedDate, "2026-07-10");
  assert.deepEqual(state.urls, ["https://example.com/a", "https://history.example/kept"]);
  assert.match(await readFile(first.path, "utf8"), /^type: "daily-digest"$/m);
});

test("runDailyDigest throws without writing when every configured source fails", async () => {
  const root = await createFixture();

  await assert.rejects(
    runDailyDigest({
      root,
      config,
      state: { urls: [] },
      dependencies: {
        now: new Date("2026-07-10T00:30:00Z"),
        fetchSources: async () => ({ items: [], failures: [{ source: "Example", message: "offline" }] }),
        summarizeItems: async () => []
      }
    }),
    /all configured news sources failed/
  );

  await assert.rejects(access(join(root, "news", "2026-07-10-daily-digest.md")));
  await assert.rejects(access(join(root, "config", "news-seen.json")));
});

test("runDailyDigest leaves digest and state untouched when no fresh items remain", async () => {
  const root = await createFixture();
  const result = await runDailyDigest({
    root,
    config,
    state: { urls: [item.url] },
    dependencies: {
      now: new Date("2026-07-10T00:30:00Z"),
      fetchSources: async () => ({ items: [item], failures: [] }),
      summarizeItems: async () => { throw new Error("must not summarize"); }
    }
  });

  assert.equal(result.status, "no-fresh-items");
  await assert.rejects(access(join(root, "news", "2026-07-10-daily-digest.md")));
  await assert.rejects(access(join(root, "config", "news-seen.json")));
});

test("runDailyDigest removes temporary files after a write failure", async () => {
  const root = await createFixture();
  const dependencies = {
    now: new Date("2026-07-10T00:30:00Z"),
    fetchSources: async () => ({ items: [item], failures: [] }),
    summarizeItems: async (items) => items.map((entry) => ({ ...entry, ...summarizedItem })),
    rename: async () => { throw new Error("disk unavailable"); }
  };

  await assert.rejects(runDailyDigest({ root, config, state: { urls: [] }, dependencies }), /disk unavailable/);
  const files = await readdir(root, { recursive: true });
  assert.equal(files.some((file) => String(file).endsWith(".tmp")), false);
});

test("fetch-news CLI exposes force without a fake translation fallback", () => {
  assert.deepEqual(parseArguments([]), { force: false });
  assert.deepEqual(parseArguments(["--force"]), { force: true });
  assert.throws(() => parseArguments(["--allow-source-fallback"]), /Unknown argument/);
  assert.throws(() => parseArguments(["--unknown"]), /Unknown argument/);
});

test("runDailyDigest passes source caps and group quotas into selection", async () => {
  const root = await createFixture();
  let selectionOptions;
  await runDailyDigest({
    root,
    config: { ...config, maxPerSource: 2, groupQuotas: { cn: 2, global: 2 } },
    state: { urls: [] },
    dependencies: {
      now: new Date("2026-07-10T00:30:00Z"),
      fetchSources: async () => ({ items: [item], failures: [] }),
      selectFreshItems: (items, options) => { selectionOptions = options; return items; },
      summarizeItems: async (items) => items.map((entry) => ({ ...entry, ...summarizedItem }))
    }
  });

  assert.equal(selectionOptions.maxPerSource, 2);
  assert.deepEqual(selectionOptions.groupQuotas, { cn: 2, global: 2 });
});

test("runDailyDigest forwards compatible AI provider configuration", async () => {
  const root = await createFixture();
  let summaryOptions;

  await runDailyDigest({
    root,
    config,
    state: { urls: [] },
    apiKey: "dashscope-key",
    apiBaseUrl: "https://workspace.example.com/compatible-mode/v1",
    model: "qwen-test",
    dependencies: {
      now: new Date("2026-07-10T00:30:00Z"),
      fetchSources: async () => ({ items: [item], failures: [] }),
      summarizeItems: async (items, options) => {
        summaryOptions = options;
        return items.map((entry) => ({ ...entry, ...summarizedItem }));
      }
    }
  });

  assert.equal(summaryOptions.apiKey, "dashscope-key");
  assert.equal(summaryOptions.apiBaseUrl, "https://workspace.example.com/compatible-mode/v1");
  assert.equal(summaryOptions.model, "qwen-test");
});

test("fetch-news writes machine-readable change metadata to GITHUB_OUTPUT", async () => {
  const root = await createFixture();
  const output = join(root, "github-output");

  await writeGithubOutput({ changed: true, digestPath: "src/content/news/2026-07-10-daily-digest.md" }, output);

  assert.equal(
    await readFile(output, "utf8"),
    "changed=true\ndigest_path=src/content/news/2026-07-10-daily-digest.md\n"
  );
});

test("fetch-news writes source health to the GitHub step summary", async () => {
  const root = await createFixture();
  const output = join(root, "github-summary");
  await writeGithubStepSummary({
    status: "published", date: "2026-07-10", fetchedCount: 23, selectedCount: 8,
    failures: [{ source: "Offline Feed", message: "timeout" }],
    sourceHealth: [
      { source: "OpenAI", status: "ok", itemCount: 12 },
      { source: "Quiet Feed", status: "empty", itemCount: 0 },
      { source: "Offline Feed", status: "failed", itemCount: 0, message: "timeout" }
    ]
  }, output);

  const markdown = await readFile(output, "utf8");
  assert.match(markdown, /Daily News 2026-07-10/);
  assert.match(markdown, /Fetched \| 23/);
  assert.match(markdown, /Selected \| 8/);
  assert.match(markdown, /Offline Feed: timeout/);
  assert.match(markdown, /OpenAI \| ok \| 12/);
  assert.match(markdown, /Quiet Feed \| empty \| 0/);
});
