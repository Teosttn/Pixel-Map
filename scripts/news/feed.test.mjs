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
