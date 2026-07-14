function yamlString(value) {
  return JSON.stringify(String(value));
}

function yamlArray(values) {
  return `[${values.map(yamlString).join(", ")}]`;
}

function uniqueSources(items) {
  return [...new Set(items.map((item) => item.source).filter(Boolean))];
}

function withoutOriginalUrl(value, url) {
  return String(value).replaceAll(url, "").replace(/[ \t]{2,}/g, " ").trim();
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
    `## ${index + 1}. ${withoutOriginalUrl(item.titleZh, item.url)} / ${withoutOriginalUrl(item.titleEn, item.url)}`,
    "",
    `中文摘要：${withoutOriginalUrl(item.summaryZh, item.url)}`,
    "",
    `English summary: ${withoutOriginalUrl(item.summaryEn, item.url)}`,
    "",
    `中文短评：${withoutOriginalUrl(item.commentZh, item.url)}`,
    "",
    `English note: ${withoutOriginalUrl(item.commentEn, item.url)}`,
    "",
    `发布：${item.publishedAt} | 来源：[${withoutOriginalUrl(item.source, item.url) || "Source"}](${item.url})`
  ].join("\n"));

  return `${frontmatter}\n\n${sections.join("\n\n")}\n`;
}
