import fs from "node:fs";
import path from "node:path";

const sourceRoot = "/private/tmp/personal-blog-source/source/_posts";
const targetRoot = path.join(process.cwd(), "src", "content", "blog");

const posts = [
  {
    file: "Antv-l7-地图可视化入门.md",
    slug: "antv-l7-map-visualization-intro",
    category: "Frontend",
    tags: ["AntV L7", "map", "visualization", "vue"]
  },
  {
    file: "Antv-l7-高德地图API的token问题.md",
    slug: "antv-l7-amap-token",
    category: "Frontend",
    tags: ["AntV L7", "AMap", "debugging", "vue"]
  },
  {
    file: "NodeJS简单使用.md",
    slug: "nodejs-basic-usage",
    category: "Backend",
    tags: ["Node.js", "backend", "http"]
  },
  {
    file: "SVN的配置和使用.md",
    slug: "svn-setup-and-usage",
    category: "Tools",
    tags: ["SVN", "version-control", "tools"]
  },
  {
    file: "TypeScript的浅显理解.md",
    slug: "typescript-basic-understanding",
    category: "Frontend",
    tags: ["TypeScript", "JavaScript", "frontend"]
  },
  {
    file: "关于hexo博客的图片插入问题.md",
    slug: "hexo-blog-image-insertion",
    category: "Blogging",
    tags: ["Hexo", "Markdown", "images"]
  },
  {
    file: "浅谈Electron-vue.md",
    slug: "electron-vue-intro",
    category: "Desktop",
    tags: ["Electron", "Vue", "desktop"]
  }
];

function parse(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair && pair[2].trim()) data[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: match[2].trim() };
}

function summaryFrom(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/:::[\s\S]*?\n/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\{[^}]+\}/g, "")
    .replace(/[#>*`_\-[\]()+:=.%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 118);
}

fs.mkdirSync(targetRoot, { recursive: true });

for (const post of posts) {
  const raw = fs.readFileSync(path.join(sourceRoot, post.file), "utf8");
  const { data, body } = parse(raw);
  const preserved = body.trim();
  const date = (data.date || "2024-01-01").slice(0, 10);
  const title = data.title || post.file.replace(/\.md$/, "");
  const output = `---\ntitle: "${title}"\nslug: "${post.slug}"\ndate: "${date}"\nsummary: "${summaryFrom(preserved).replace(/"/g, '\\"')}"\ntags: [${post.tags.map((tag) => `"${tag}"`).join(", ")}]\ncategory: "${post.category}"\npublished: true\n---\n\n${preserved}\n`;

  fs.writeFileSync(path.join(targetRoot, `${post.slug}.md`), output, "utf8");
}

console.log(`Migrated ${posts.length} technical posts.`);
