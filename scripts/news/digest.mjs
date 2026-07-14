function yamlString(value) {
  return JSON.stringify(String(value));
}

function yamlArray(values) {
  return `[${values.map(yamlString).join(", ")}]`;
}

function compactText(value, originalUrl) {
  const text = originalUrl
    ? String(value).replaceAll(originalUrl, "")
    : String(value);

  return text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueSources(items) {
  return [...new Set(items.map((item) => compactText(item.source, item.url)).filter(Boolean))];
}

function safeMarkdownText(value, originalUrl) {
  return compactText(value, originalUrl)
    .replace(/([\\`*_[\]()<>{}#!])/g, "\\$1")
    .replace(/\bhttps?:\/\//gi, (url) => url.replace(":", "&#58;"))
    .replace(/\bwww\./gi, "www&#46;");
}

export function digestSlug(date) {
  return `${date}-daily-digest`;
}

export function renderDigest({ date, items }) {
  const sources = uniqueSources(items);
  const frontmatter = [
    "---",
    'type: "daily-digest"',
    `title: ${yamlString(`Daily Signals - ${date}`)}`,
    `titleZh: ${yamlString(`每日技术资讯 - ${date}`)}`,
    `titleEn: ${yamlString(`Daily Signals - ${date}`)}`,
    `date: ${yamlString(date)}`,
    'summaryZh: "今日技术资讯摘要。"',
    'summaryEn: "Today\'s technology digest."',
    'tags: ["daily-digest", "technology"]',
    "published: true",
    `itemCount: ${items.length}`,
    `sources: ${yamlArray(sources)}`,
    "---"
  ].join("\n");

  const sections = items.map((item, index) => [
    `## ${index + 1}. ${safeMarkdownText(item.titleZh, item.url)} / ${safeMarkdownText(item.titleEn, item.url)}`,
    "",
    `中文摘要：${safeMarkdownText(item.summaryZh, item.url)}`,
    "",
    `English summary: ${safeMarkdownText(item.summaryEn, item.url)}`,
    "",
    `中文短评：${safeMarkdownText(item.commentZh, item.url)}`,
    "",
    `English note: ${safeMarkdownText(item.commentEn, item.url)}`,
    "",
    `发布：${item.publishedAt} | 来源：[${safeMarkdownText(item.source, item.url) || "Source"}](${item.url})`
  ].join("\n"));

  return `${frontmatter}\n\n${sections.join("\n\n")}\n`;
}
