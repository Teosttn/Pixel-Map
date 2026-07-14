import test from "node:test";
import assert from "node:assert/strict";
import { summarizeItems, validateSummaryOutput } from "./openai.mjs";

const item = {
  title: "New reasoning model",
  summary: "A new model improves tool use.",
  source: "Example",
  publishedAt: "2026-07-14T00:00:00.000Z",
  url: "https://example.com/model",
  tags: ["AI"]
};

const valid = {
  titleZh: "新推理模型发布",
  titleEn: "New reasoning model released",
  summaryZh: "一个新模型提升了工具调用能力。",
  summaryEn: "A new model improves tool use.",
  commentZh: "这项更新值得关注，但仍需查看原始评测。",
  commentEn: "The update is notable, but the original evaluation still matters."
};

function response(value) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(value) }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

test("validateSummaryOutput rejects English copied into Chinese fields", () => {
  assert.throws(
    () => validateSummaryOutput([{ ...valid, titleZh: "Another English title", summaryZh: "Another English summary" }], 1),
    /Chinese text/
  );
});

test("validateSummaryOutput rejects Chinese copied into English fields", () => {
  assert.throws(
    () => validateSummaryOutput([{ ...valid, titleEn: "另一条中文标题", summaryEn: "另一段中文摘要" }], 1),
    /English text/
  );
});

test("validateSummaryOutput rejects identical bilingual fields", () => {
  const duplicated = { ...valid, titleZh: "Qwen 4", titleEn: "Qwen 4" };
  assert.throws(() => validateSummaryOutput([duplicated], 1), /must not be identical/);
});

test("summarizeItems repairs one invalid translation and returns validated bilingual text", async () => {
  const requests = [];
  const responses = [
    response([{ ...valid, summaryZh: valid.summaryEn }]),
    response([valid])
  ];
  const result = await summarizeItems([item], {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => { requests.push(JSON.parse(String(init.body))); return responses.shift(); }
  });

  assert.equal(requests.length, 2);
  assert.match(requests[0].input[0].content, /Simplified Chinese/);
  assert.match(requests[1].input[0].content, /repair/i);
  assert.equal(result[0].summaryZh, valid.summaryZh);
  assert.equal(result[0].url, item.url);
});

test("summarizeItems aborts after a second invalid translation", async () => {
  const invalid = [{ ...valid, commentZh: valid.commentEn }];
  let calls = 0;
  await assert.rejects(
    summarizeItems([item], { apiKey: "test-key", fetchImpl: async () => { calls += 1; return response(invalid); } }),
    /after repair/
  );
  assert.equal(calls, 2);
});
