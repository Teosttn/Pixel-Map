const REQUIRED_TEXT_FIELDS = [
  "titleZh",
  "titleEn",
  "summaryZh",
  "summaryEn",
  "commentZh",
  "commentEn"
];

function cloneFeedItem(item) {
  return {
    ...item,
    ...(Array.isArray(item.tags) ? { tags: [...item.tags] } : {})
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
    for (const stem of ["title", "summary", "comment"]) {
      const zh = item[`${stem}Zh`].toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/gu, " ").trim();
      const en = item[`${stem}En`].toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/gu, " ").trim();
      if (zh === en) throw new Error(`OpenAI item ${index} ${stem} translations must not be identical`);
    }
    for (const key of ["titleZh", "summaryZh", "commentZh"]) {
      if (!/[\u3400-\u9fff]/u.test(item[key])) throw new Error(`OpenAI item ${index} ${key} must contain Chinese text`);
    }
    for (const key of ["titleEn", "summaryEn", "commentEn"]) {
      if (!/[A-Za-z]/.test(item[key]) || /[\u3400-\u9fff]/u.test(item[key])) throw new Error(`OpenAI item ${index} ${key} must contain English text`);
    }
  });

  return value;
}

export async function summarizeItems(items, options = {}) {
  const {
    apiKey,
    apiBaseUrl = "https://api.openai.com/v1",
    model = "gpt-4.1-mini",
    fetchImpl = fetch
  } = options;

  if (!apiKey) {
    throw new Error("NEWS_AI_API_KEY is required for news summarization");
  }

  if (items.length === 0) return [];

  const request = async (system, user) => {
    const response = await fetchImpl(`${apiBaseUrl.replace(/\/+$/, "")}/responses`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.2
      })
    });
    if (!response.ok) throw new Error(`OpenAI summary request failed with ${response.status}: ${await response.text()}`);
    return responseText(await response.json());
  };

  const basePrompt = "Translate and summarize each technical news item into genuine bilingual text. Every *Zh field must be natural Simplified Chinese and every *En field must be natural English; corresponding fields must not be copied or identical. Return only one valid JSON array in the same order and length as the input. Each object must contain non-empty strings for titleZh, titleEn, summaryZh, summaryEn, commentZh, and commentEn. Do not include Markdown or any other fields. Preserve factual uncertainty and do not add facts beyond the supplied item.";
  const input = JSON.stringify(summaryInput(items));
  const firstText = await request(basePrompt, input);
  let summaries;
  try {
    summaries = validateSummaryOutput(parseSummaryArray(firstText), items.length);
  } catch (firstError) {
    const repairPrompt = `${basePrompt} Repair the previous response because it failed strict language or JSON validation. Return a complete corrected array, not an explanation.`;
    const repairedText = await request(repairPrompt, JSON.stringify({ sourceItems: summaryInput(items), invalidResponse: firstText, validationError: firstError.message }));
    try {
      summaries = validateSummaryOutput(parseSummaryArray(repairedText), items.length);
    } catch (repairError) {
      throw new Error(`OpenAI bilingual output remained invalid after repair: ${repairError.message}`);
    }
  }

  return items.map((item, index) => {
    const text = summaries[index];
    return Object.assign(cloneFeedItem(item), ...REQUIRED_TEXT_FIELDS.map((key) => ({ [key]: text[key].trim() })));
  });
}
