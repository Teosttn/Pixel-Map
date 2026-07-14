import test from "node:test";
import assert from "node:assert/strict";
import { renderDigest, digestSlug } from "./digest.mjs";
import { summarizeItems, validateSummaryOutput } from "./openai.mjs";

const item = {
  title: "Release",
  url: "https://example.com/release",
  summary: "Release details.",
  publishedAt: "2026-07-10T00:00:00.000Z",
  source: "Example",
  tags: ["tech"],
  weight: 1
};

const bilingualText = {
  titleZh: "发布",
  titleEn: "Release",
  summaryZh: "中文摘要",
  summaryEn: "English summary",
  commentZh: "中文短评",
  commentEn: "English note"
};

test("validateSummaryOutput rejects missing records and blank bilingual fields", () => {
  assert.throws(() => validateSummaryOutput([], 1), /expected 1 items/);
  assert.throws(
    () => validateSummaryOutput([{ ...bilingualText, commentEn: " " }], 1),
    /item 0 missing commentEn/
  );
});

test("summarizeItems requires an API key unless fallback is explicitly allowed", async () => {
  await assert.rejects(
    summarizeItems([item], { fetchImpl: async () => { throw new Error("must not fetch"); } }),
    /OPENAI_API_KEY is required/
  );

  const fallback = await summarizeItems([item], { allowFallback: true });
  assert.deepEqual(fallback[0], {
    ...item,
    titleZh: item.title,
    titleEn: item.title,
    summaryZh: `原文摘要：${item.summary}`,
    summaryEn: item.summary,
    commentZh: "已保留原文链接，建议打开来源阅读全文并核对上下文。",
    commentEn: "Original link retained for source verification."
  });

  await assert.rejects(
    summarizeItems([item], { allowFallback: "true" }),
    /OPENAI_API_KEY is required/
  );
});

test("summarizeItems uses Responses output text and preserves source metadata", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      output: [{ content: [{ text: JSON.stringify([{
        ...bilingualText,
        url: "https://malicious.example/rewritten",
        source: "Rewritten",
        publishedAt: "2026-01-01T00:00:00.000Z",
        tags: ["rewritten"],
        weight: 999
      }]) }] }]
    }));
  };

  const result = await summarizeItems([item], { apiKey: "test-key", model: "test-model", fetchImpl });

  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer test-key");
  assert.equal(JSON.parse(request.options.body).model, "test-model");
  assert.deepEqual(result, [{ ...item, ...bilingualText }]);
});

test("summarizeItems rejects a Responses result that is not one strict JSON array", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ output_text: "Here is the result: []" }));

  await assert.rejects(
    summarizeItems([item], { apiKey: "test-key", fetchImpl }),
    /valid JSON array/
  );
});

test("renderDigest creates frontmatter and one original link per item", () => {
  const markdown = renderDigest({ date: "2026-07-10", items: [{ ...item, ...bilingualText }] });

  assert.match(markdown, /^---\ntype: "daily-digest"\n/m);
  assert.match(markdown, /title: "Daily Signals - 2026-07-10"/);
  assert.match(markdown, /titleZh: "每日技术资讯 - 2026-07-10"/);
  assert.match(markdown, /itemCount: 1/);
  assert.match(markdown, /sources: \["Example"\]/);
  assert.match(markdown, /## 1\. 发布 \/ Release/);
  assert.match(markdown, /中文摘要：中文摘要/);
  assert.match(markdown, /English summary: English summary/);
  assert.match(markdown, /中文短评：中文短评/);
  assert.match(markdown, /English note: English note/);
  assert.match(markdown, /发布：2026-07-10T00:00:00\.000Z \| 来源：\[Example\]\(https:\/\/example\.com\/release\)/);
  assert.equal((markdown.match(/https:\/\/example\.com\/release/g) || []).length, 1);
  assert.equal(digestSlug("2026-07-10"), "2026-07-10-daily-digest");
});

test("renderDigest keeps the original URL to its single source link when text repeats it", () => {
  const markdown = renderDigest({
    date: "2026-07-10",
    items: [{ ...item, ...bilingualText, summaryEn: `Read ${item.url} for details.` }]
  });

  assert.equal((markdown.match(/https:\/\/example\.com\/release/g) || []).length, 1);
});
