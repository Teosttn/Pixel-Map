import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const newsRoot = join(process.cwd(), "src", "content", "news");
const files = readdirSync(newsRoot).filter((name) => name.endsWith(".md"));

assert.ok(files.length > 0, "news content must include at least one daily digest");
for (const file of files) {
  assert.match(file, /^\d{4}-\d{2}-\d{2}-daily-digest\.md$/, `${file} must use the daily digest filename`);
  const source = readFileSync(join(newsRoot, file), "utf8");
  assert.match(source, /^type: "daily-digest"$/m, `${file} must be a digest`);
  assert.match(source, /^itemCount: [1-9]\d*$/m, `${file} must declare its item count`);
  assert.match(source, /\]\((?:https?:\/\/|\/)/, `${file} must retain a source link`);
}

const newsPage = readFileSync(join(process.cwd(), "src", "app", "news", "page.tsx"), "utf8");
const detailPage = readFileSync(join(process.cwd(), "src", "app", "news", "[slug]", "page.tsx"), "utf8");
const rss = readFileSync(join(process.cwd(), "src", "app", "rss.xml", "route.ts"), "utf8");
const sitemap = readFileSync(join(process.cwd(), "src", "app", "sitemap.xml", "route.ts"), "utf8");

assert.match(newsPage, /getNewsDigests/);
assert.match(detailPage, /generateStaticParams/);
assert.match(detailPage, /markdownToHtml/);
assert.match(rss, /getNewsDigests/);
assert.match(sitemap, /getNewsDigests/);
