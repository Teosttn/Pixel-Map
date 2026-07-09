import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const contentRoot = join(process.cwd(), "src", "content");
const defaultConfigPath = join(contentRoot, "config", "news-sources.json");
const defaultSeenPath = join(contentRoot, "config", "news-seen.json");
const newsRoot = join(contentRoot, "news");

function decodeHtml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readTag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return stripTags(match[1]);
  }
  return "";
}

function readLink(block) {
  const atomLink = block.match(/<link\b([^>]*)\/?>/i);
  const href = atomLink?.[1]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (href) return decodeHtml(href).trim();
  return readTag(block, ["link", "guid", "id"]);
}

function readDate(block, today) {
  const rawDate = readTag(block, ["pubDate", "published", "updated", "dc:date"]);
  const parsed = rawDate ? new Date(rawDate) : new Date(today);
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

function truncate(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function hash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function yamlArray(values) {
  return `[${[...new Set(values.filter(Boolean).map(String))].map(yamlString).join(", ")}]`;
}

function scoreItem(item, topicKeywords = []) {
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  const topicScore = topicKeywords.reduce((score, keyword) => {
    return haystack.includes(String(keyword).toLowerCase()) ? score + 1 : score;
  }, 0);
  return Number(item.weight || 1) + topicScore;
}

function normalizeTitleKey(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\bis now available\b/g, "")
    .replace(/\bnow available\b/g, "")
    .replace(/\breleased\b/g, "")
    .replace(/\bintroducing\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeed(xml, source, options = {}) {
  const today = options.today || new Date().toISOString().slice(0, 10);
  const blocks = [
    ...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...String(xml).matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
  ].map((match) => match[1]);

  return blocks
    .map((block) => {
      const title = readTag(block, ["title"]);
      const url = readLink(block);
      const summary = readTag(block, ["description", "summary", "content:encoded", "content"]);
      return {
        title,
        url,
        summary: truncate(summary || title, 320),
        date: readDate(block, today),
        source: source.name,
        sourceUrl: source.url,
        tags: source.tags || [],
        weight: source.weight ?? 1
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.url));
}

export function selectSignals(items, options = {}) {
  const maxItems = options.maxItems ?? 5;
  const seenUrls = options.seenUrls || new Set();
  const topicKeywords = options.topicKeywords || [];
  const usedUrls = new Set();
  const usedTitles = new Set();

  return [...items]
    .map((item) => ({ ...item, score: scoreItem(item, topicKeywords) }))
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    .filter((item) => {
      const urlKey = item.url.toLowerCase();
      const titleKey = normalizeTitleKey(item.title);
      if (seenUrls.has(urlKey) || usedUrls.has(urlKey) || usedTitles.has(titleKey)) return false;
      usedUrls.add(urlKey);
      usedTitles.add(titleKey);
      return true;
    })
    .slice(0, maxItems);
}

export function createFallbackSignal(item, today = new Date().toISOString().slice(0, 10)) {
  const summary = truncate(item.summary || item.title, 220);
  return {
    title: item.title,
    titleZh: item.title,
    titleEn: item.title,
    date: today,
    source: item.source,
    url: item.url,
    summary: summary,
    summaryZh: `原文摘要：${summary}`,
    summaryEn: summary,
    comment: "Original link retained for source verification.",
    commentZh: "已保留原文链接，建议打开来源阅读全文并核对上下文。",
    commentEn: "Original link retained for source verification.",
    tags: item.tags || [],
    pinned: false
  };
}

export function slugForSignal(signal) {
  const base = String(signal.titleEn || signal.title || signal.url)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72)
    .replace(/-$/g, "");
  return `${signal.date}-${base || hash(signal.url)}`;
}

export function renderNewsMarkdown(signal) {
  const tags = yamlArray(signal.tags || []);
  return `---\ntitle: ${yamlString(signal.title)}\ntitleZh: ${yamlString(signal.titleZh || signal.title)}\ntitleEn: ${yamlString(signal.titleEn || signal.title)}\ndate: ${yamlString(signal.date)}\nsource: ${yamlString(signal.source)}\nurl: ${yamlString(signal.url)}\nsummary: ${yamlString(signal.summary)}\nsummaryZh: ${yamlString(signal.summaryZh || signal.summary)}\nsummaryEn: ${yamlString(signal.summaryEn || signal.summary)}\ncomment: ${yamlString(signal.comment || "")}\ncommentZh: ${yamlString(signal.commentZh || signal.comment || "")}\ncommentEn: ${yamlString(signal.commentEn || signal.comment || "")}\ntags: ${tags}\npinned: ${signal.pinned ? "true" : "false"}\n---\n\n原文链接：[${signal.source}](${signal.url})\n\nOriginal link: [${signal.source}](${signal.url})\n`;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readSeenUrls(seenPath = defaultSeenPath) {
  const seenConfig = readJson(seenPath, { urls: [] });
  const urls = new Set((seenConfig.urls || []).map((url) => String(url).toLowerCase()));
  if (!existsSync(newsRoot)) return urls;

  for (const file of readdirSync(newsRoot)) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(newsRoot, file), "utf8");
    const match = raw.match(/^url:\s*["']?([^"'\n]+)["']?/m);
    if (match) urls.add(match[1].trim().toLowerCase());
  }

  return urls;
}

async function fetchSource(source, today) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "Pixel-Map-NewsBot/1.0 (+https://github.com/Teosttn/Pixel-Map)"
    }
  });
  if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
  return parseFeed(await response.text(), source, { today });
}

function extractJsonArray(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.startsWith("[")) return JSON.parse(trimmed);
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("OpenAI response did not include a JSON array");
  return JSON.parse(match[0]);
}

async function enhanceWithOpenAI(signals, config) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEWS_OPENAI_API_KEY;
  if (!apiKey || signals.length === 0) return signals;

  const model = process.env.NEWS_OPENAI_MODEL || config.openAiModel || "gpt-4.1-mini";
  const input = [
    {
      role: "system",
      content:
        "You rewrite technical news items as concise bilingual blog signals. Return only a valid JSON array with the same length and order as the input. Each object must include exactly these string fields: title, titleZh, titleEn, summary, summaryZh, summaryEn, comment, commentZh, commentEn. Keep titleEn close to the original title. Write titleZh, summaryZh, and commentZh in natural Simplified Chinese. Write summaryEn and commentEn in concise English. Do not include markdown. Preserve factual uncertainty and do not add facts not present in the source summary."
    },
    {
      role: "user",
      content: JSON.stringify(
        signals.map((signal) => ({
          title: signal.title,
          source: signal.source,
          url: signal.url,
          summary: signal.summary,
          date: signal.date,
          tags: signal.tags,
          pinned: signal.pinned
        }))
      )
    }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI summary request failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output
      ?.flatMap((entry) => entry.content || [])
      .map((content) => content.text || "")
      .join("\n");
  const enhanced = extractJsonArray(text);

  return signals.map((signal, index) => ({
    ...signal,
    ...enhanced[index],
    url: signal.url,
    source: signal.source,
    date: signal.date,
    tags: signal.tags,
    pinned: signal.pinned
  }));
}

export async function runNewsBot(options = {}) {
  const configPath = options.configPath || defaultConfigPath;
  const seenPath = options.seenPath || defaultSeenPath;
  const today = options.today || new Date().toISOString().slice(0, 10);
  const config = readJson(configPath, { maxItemsPerRun: 5, topicKeywords: [], sources: [] });
  const seenUrls = readSeenUrls(seenPath);
  const fetched = [];

  for (const source of config.sources || []) {
    try {
      fetched.push(...(await fetchSource(source, today)));
    } catch (error) {
      console.warn(`[news-bot] Skipping ${source.name}: ${error.message}`);
    }
  }

  const selected = selectSignals(fetched, {
    maxItems: config.maxItemsPerRun || 5,
    seenUrls,
    topicKeywords: config.topicKeywords || []
  });
  let signals = selected.map((item) => createFallbackSignal(item, today));

  try {
    signals = await enhanceWithOpenAI(signals, config);
  } catch (error) {
    console.warn(`[news-bot] Falling back to source summaries: ${error.message}`);
  }

  mkdirSync(newsRoot, { recursive: true });
  mkdirSync(join(contentRoot, "config"), { recursive: true });

  const written = [];
  for (const signal of signals) {
    const slug = slugForSignal(signal);
    const file = join(newsRoot, `${slug}.md`);
    if (existsSync(file)) continue;
    writeFileSync(file, renderNewsMarkdown(signal), "utf8");
    written.push(file);
    seenUrls.add(signal.url.toLowerCase());
  }

  const seen = [...seenUrls].sort();
  writeFileSync(seenPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), urls: seen }, null, 2)}\n`, "utf8");

  return { written, selectedCount: selected.length, fetchedCount: fetched.length };
}
