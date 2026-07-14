import test from "node:test";
import assert from "node:assert/strict";
import { fetchSources, parseFeed } from "./feed.mjs";

test("parseFeed preserves source publication timestamps, links, and editorial grouping", () => {
  const xml = `<rss><channel><item><title>Release</title><link>https://example.com/release</link><description>Details</description><pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
  const items = parseFeed(xml, { name: "Example", url: "https://example.com/rss", tags: ["tech"], weight: 1, region: "cn", category: "industry", group: "cn" }, new Date("2026-07-10T01:00:00Z"));
  assert.deepEqual(items[0], {
    title: "Release", url: "https://example.com/release", summary: "Details",
    publishedAt: "2026-07-10T00:00:00.000Z", source: "Example", tags: ["tech"], weight: 1,
    region: "cn", category: "industry", group: "cn"
  });
});

test("parseFeed selects an Atom article link instead of an earlier self link", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom release</title>
        <link rel="self" href="https://example.com/feed/entries/atom-release" />
        <link rel="alternate" href="https://example.com/atom-release" />
        <summary>Release details</summary>
        <published>2026-07-10T00:00:00Z</published>
      </entry>
    </feed>`;
  const items = parseFeed(xml, { name: "Example" }, new Date("2026-07-10T01:00:00Z"));

  assert.equal(items[0].url, "https://example.com/atom-release");
});

test("fetchSources retries one source and reports a permanently failed source", async () => {
  const calls = new Map();
  const signals = [];
  const fetchImpl = async (url, options) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    signals.push(options.signal);
    if (url.endsWith("bad")) throw new Error("offline");
    if (calls.get(url) === 1) throw new Error("temporary");
    return new Response(`<rss><channel><item><title>OK</title><link>https://example.com/a</link><pubDate>Fri, 10 Jul 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
  };
  const result = await fetchSources([{ name: "Good", url: "https://feed/good" }, { name: "Bad", url: "https://feed/bad" }], { fetchImpl, now: new Date("2026-07-10T01:00:00Z"), attempts: 2, timeoutMs: 50 });
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.failures.map((failure) => failure.source), ["Bad"]);
  assert.deepEqual(result.sourceHealth, [
    { source: "Good", status: "ok", itemCount: 1 },
    { source: "Bad", status: "failed", itemCount: 0, message: "offline" }
  ]);
  assert.equal(calls.get("https://feed/good"), 2);
  assert.equal(calls.get("https://feed/bad"), 2);
  assert.equal(signals.length, 4);
  assert.ok(signals.every((signal) => signal instanceof AbortSignal));
  assert.equal(new Set(signals).size, signals.length);
});

test("fetchSources reports a reachable feed with no entries as empty", async () => {
  const result = await fetchSources([{ name: "Empty", url: "https://feed/empty" }], {
    fetchImpl: async () => new Response("<rss><channel></channel></rss>"),
    now: new Date("2026-07-10T01:00:00Z"), attempts: 1, timeoutMs: 50
  });
  assert.deepEqual(result.sourceHealth, [{ source: "Empty", status: "empty", itemCount: 0 }]);
});
