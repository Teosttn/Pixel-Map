import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalUrl, selectFreshItems, shanghaiDate } from "./domain.mjs";

test("test:news uses only the modular node tests after the monolith migration", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8")
  );

  assert.equal(
    packageJson.scripts["test:news"],
    "node --test scripts/news/*.test.mjs"
  );
});

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
  assert.deepEqual(selected.map((item) => item.url), ["https://example.com/b"]);
});

test("selectFreshItems breaks equal-score ties by chronological publishedAt", () => {
  const items = [
    {
      title: "Offset older",
      url: "https://example.com/older",
      summary: "",
      publishedAt: "2026-07-10T23:30:00+08:00",
      source: "A",
      tags: [],
      weight: 1.125
    },
    {
      title: "Offset newer",
      url: "https://example.com/newer",
      summary: "",
      publishedAt: "2026-07-10T10:00:00-06:00",
      source: "B",
      tags: [],
      weight: 1
    }
  ];
  const selected = selectFreshItems(items, {
    now: new Date("2026-07-10T17:00:00Z"),
    maxAgeHours: 4,
    maxItems: 2,
    seenUrls: new Set(),
    topicKeywords: []
  });

  assert.equal(selected[0].score, selected[1].score);
  assert.deepEqual(
    selected.map((item) => item.url),
    ["https://example.com/newer", "https://example.com/older"]
  );
});

test("selectFreshItems preserves an explicit zero weight", () => {
  const selected = selectFreshItems([
    {
      title: "Zero weight",
      url: "https://example.com/zero",
      summary: "",
      publishedAt: "2026-07-10T17:00:00Z",
      source: "A",
      tags: [],
      weight: 0
    }
  ], {
    now: new Date("2026-07-10T17:00:00Z"),
    maxAgeHours: 72,
    maxItems: 1,
    seenUrls: new Set(),
    topicKeywords: []
  });

  assert.equal(selected[0].score, 1);
});

test("selectFreshItems enforces source caps and fills configured group quotas", () => {
  const now = new Date("2026-07-10T17:00:00Z");
  const makeItem = (source, group, index, weight) => ({
    title: `${source} story ${index}`,
    url: `https://${source.toLowerCase()}.example/${index}`,
    summary: "AI model release",
    publishedAt: new Date(now.getTime() - index * 60_000).toISOString(),
    source,
    group,
    tags: ["AI"],
    weight
  });
  const items = [
    ...Array.from({ length: 5 }, (_, index) => makeItem("Vercel", "global", index, 10)),
    makeItem("MachineHeart", "cn", 10, 1),
    makeItem("Qwen", "cn", 11, 1),
    makeItem("Arxiv", "research", 12, 1),
    makeItem("HuggingFace", "open-source", 13, 1)
  ];

  const selected = selectFreshItems(items, {
    now,
    maxAgeHours: 72,
    maxItems: 6,
    maxPerSource: 2,
    groupQuotas: { cn: 2, global: 2, research: 1, "open-source": 1 },
    seenUrls: new Set(),
    topicKeywords: ["AI"]
  });

  assert.deepEqual(
    Object.fromEntries([...new Set(selected.map((item) => item.group))].map((group) => [group, selected.filter((item) => item.group === group).length])),
    { cn: 2, global: 2, research: 1, "open-source": 1 }
  );
  assert.equal(selected.filter((item) => item.source === "Vercel").length, 2);
});
