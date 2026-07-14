const REQUIRED_TEXT_FIELDS = [
  "titleZh",
  "titleEn",
  "summaryZh",
  "summaryEn",
  "commentZh",
  "commentEn"
];

function fallbackItem(item) {
  const summary = String(item.summary || item.title || "").trim();

  return {
    ...item,
    titleZh: item.title,
    titleEn: item.title,
    summaryZh: `原文摘要：${summary}`,
    summaryEn: summary,
    commentZh: "已保留原文链接，建议打开来源阅读全文并核对上下文。",
    commentEn: "Original link retained for source verification."
  };
}

function responseText(data) {
  const text = data.output_text || data.output
    ?.flatMap((entry) => entry.content || [])
    .map((content) => content.text || "")
    .join("\n");

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenAI response did not include text output");
  }

  return text;
}

function parseSummaryArray(text) {
  try {
    const value = JSON.parse(text.trim());
    if (!Array.isArray(value)) throw new Error("not an array");
    return value;
  } catch {
    throw new Error("OpenAI response must be a valid JSON array");
  }
}

function summaryInput(items) {
  return items.map((item) => ({
    title: item.title,
    summary: item.summary,
    source: item.source,
    publishedAt: item.publishedAt,
    tags: item.tags
  }));
}

export function validateSummaryOutput(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`OpenAI summary expected ${expectedLength} items`);
  }

  value.forEach((item, index) => {
    for (const key of REQUIRED_TEXT_FIELDS) {
      if (!item || typeof item[key] !== "string" || !item[key].trim()) {
        throw new Error(`OpenAI item ${index} missing ${key}`);
      }
    }
  });

  return value;
}

export async function summarizeItems(items, options = {}) {
  const { apiKey, model = "gpt-4.1-mini", fetchImpl = fetch, allowFallback = false } = options;
  const canFallback = allowFallback === true;
  if (items.length === 0) return [];

  if (!apiKey) {
    if (canFallback) return items.map(fallbackItem);
    throw new Error("OPENAI_API_KEY is required for news summarization");
  }

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "Summarize each technical news item bilingually. Return only one valid JSON array in the same order and length as the input. Each object must contain non-empty strings for titleZh, titleEn, summaryZh, summaryEn, commentZh, and commentEn. Do not include Markdown or any other fields. Preserve factual uncertainty and do not add facts beyond the supplied item."
          },
          { role: "user", content: JSON.stringify(summaryInput(items)) }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI summary request failed with ${response.status}: ${await response.text()}`);
    }

    const summaries = validateSummaryOutput(
      parseSummaryArray(responseText(await response.json())),
      items.length
    );

    return items.map((item, index) => {
      const text = summaries[index];
      return Object.assign({}, item, ...REQUIRED_TEXT_FIELDS.map((key) => ({ [key]: text[key].trim() })));
    });
  } catch (error) {
    if (canFallback) return items.map(fallbackItem);
    throw error;
  }
}
