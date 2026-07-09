import assert from "node:assert/strict";
import {
  createFallbackSignal,
  parseFeed,
  renderNewsMarkdown,
  selectSignals,
  slugForSignal
} from "./news-bot.mjs";

const source = {
  name: "Example Feed",
  type: "rss",
  url: "https://example.com/feed.xml",
  tags: ["AI", "product"],
  weight: 1.2
};

const feed = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>AI workspaces become more verifiable</title>
    <link>https://example.com/articles/ai-workspaces</link>
    <description><![CDATA[Interfaces are adding stable review surfaces and source links.]]></description>
    <pubDate>Thu, 09 Jul 2026 02:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Older duplicate</title>
    <link>https://example.com/articles/ai-workspaces</link>
    <description>Duplicate URL should be ignored.</description>
    <pubDate>Wed, 08 Jul 2026 02:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const parsed = parseFeed(feed, source);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].url, "https://example.com/articles/ai-workspaces");
assert.equal(parsed[0].source, "Example Feed");
assert.deepEqual(parsed[0].tags, ["AI", "product"]);

const selected = selectSignals(parsed, {
  maxItems: 3,
  seenUrls: new Set(["https://already-seen.example.com"]),
  today: "2026-07-09"
});
assert.equal(selected.length, 1);

const nearDuplicateSelection = selectSignals(
  [
    {
      title: "AI SDK 7",
      url: "https://vercel.com/blog/ai-sdk-7",
      summary: "Major AI SDK release.",
      date: "2026-07-09",
      source: "Vercel Blog",
      tags: ["AI"],
      weight: 1
    },
    {
      title: "AI SDK 7 is now available",
      url: "https://vercel.com/changelog/ai-sdk-7",
      summary: "Major AI SDK release changelog.",
      date: "2026-07-09",
      source: "Vercel Blog",
      tags: ["AI"],
      weight: 1
    }
  ],
  { maxItems: 3, seenUrls: new Set(), topicKeywords: ["AI"] }
);
assert.equal(nearDuplicateSelection.length, 1);

const signal = createFallbackSignal(selected[0], "2026-07-09");
assert.equal(signal.titleEn, "AI workspaces become more verifiable");
assert.equal(signal.url, "https://example.com/articles/ai-workspaces");
assert.match(signal.summaryZh, /原文摘要/);
assert.match(signal.commentEn, /Original link retained/);

const markdown = renderNewsMarkdown(signal);
assert.match(markdown, /title: "AI workspaces become more verifiable"/);
assert.match(markdown, /titleZh: "AI workspaces become more verifiable"/);
assert.match(markdown, /summaryZh: "原文摘要：Interfaces are adding stable review surfaces and source links\."/);
assert.match(markdown, /url: "https:\/\/example\.com\/articles\/ai-workspaces"/);
assert.match(markdown, /tags: \["AI", "product"\]/);
assert.match(markdown, /原文链接：\[Example Feed\]\(https:\/\/example\.com\/articles\/ai-workspaces\)/);
assert.equal(slugForSignal(signal), "2026-07-09-ai-workspaces-become-more-verifiable");
