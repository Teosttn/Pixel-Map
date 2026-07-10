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
  assert.deepEqual(selected.map((item) => item.url), ["https://example.com/b"]);
});
