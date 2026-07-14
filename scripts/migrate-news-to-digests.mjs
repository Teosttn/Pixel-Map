import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderDigest, digestSlug } from "./news/digest.mjs";

const newsRoot = join(process.cwd(), "src", "content", "news");

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return JSON.parse(trimmed);
  return trimmed.replace(/^"|"$/g, "");
}

function parseLegacyNews(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error("News file is missing frontmatter");

  const data = Object.fromEntries(
    match[1]
      .split("\n")
      .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
      .filter(Boolean)
      .map((pair) => [pair[1], parseValue(pair[2])])
  );

  return data;
}

const files = (await readdir(newsRoot)).filter((file) => file.endsWith(".md") && !file.endsWith("-daily-digest.md"));
const groups = new Map();

for (const file of files) {
  const data = parseLegacyNews(await readFile(join(newsRoot, file), "utf8"));
  const date = String(data.date || "");
  if (!date) throw new Error(`${file} is missing a date`);
  const items = groups.get(date) || [];
  items.push({
    title: String(data.title || ""),
    titleZh: String(data.titleZh || data.title || ""),
    titleEn: String(data.titleEn || data.title || ""),
    summaryZh: String(data.summaryZh || data.summary || ""),
    summaryEn: String(data.summaryEn || data.summary || ""),
    commentZh: String(data.commentZh || data.comment || ""),
    commentEn: String(data.commentEn || data.comment || ""),
    source: String(data.source || "Source"),
    url: String(data.url || ""),
    publishedAt: `${date}T00:00:00.000Z`,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    weight: 1
  });
  groups.set(date, items);
}

for (const [date, items] of groups) {
  if (items.some((item) => !item.url)) throw new Error(`${date} has an item without its original URL`);
  const output = join(newsRoot, `${digestSlug(date)}.md`);
  await writeFile(output, renderDigest({ date, items }), "utf8");
  console.log(`generated ${output}`);
}
