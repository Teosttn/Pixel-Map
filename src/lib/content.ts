import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttrs from "markdown-it-attrs";
import markdownItContainer from "markdown-it-container";
import { full as markdownItEmoji } from "markdown-it-emoji";
import markdownItMark from "markdown-it-mark";

const contentRoot = path.join(process.cwd(), "src", "content");

export type BlogPost = {
  type: "blog";
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  category: string;
  readingTime: string;
  published: boolean;
  body: string;
};

export type NewsItem = {
  type: "news";
  slug: string;
  title: string;
  date: string;
  source: string;
  url: string;
  summary: string;
  comment?: string;
  tags: string[];
  pinned: boolean;
  body: string;
};

export type Project = {
  type: "project";
  slug: string;
  name: string;
  summary: string;
  status: "active" | "archived" | "experiment";
  tech: string[];
  demoUrl?: string;
  repoUrl?: string;
  featured: boolean;
  body: string;
};

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string | string[] | boolean> = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    const key = pair[1];
    const value = pair[2].trim();
    if (value === "true" || value === "false") {
      data[key] = value === "true";
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: match[2].trim() };
}

function readCollection<T>(folder: string, map: (slug: string, data: Record<string, unknown>, body: string) => T) {
  const dir = path.join(contentRoot, folder);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, body } = parseFrontmatter(raw);
      return map(slug, data as Record<string, unknown>, body);
    });
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function readingTime(body: string) {
  const words = body.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function getBlogPosts() {
  return readCollection<BlogPost>("blog", (slug, data, body) => ({
    type: "blog",
    slug: text(data.slug, slug),
    title: text(data.title, slug),
    date: text(data.date),
    summary: text(data.summary),
    tags: list(data.tags),
    category: text(data.category, "Notes"),
    readingTime: readingTime(body),
    published: bool(data.published, true),
    body
  }))
    .filter((post) => post.published)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNewsItems() {
  return readCollection<NewsItem>("news", (slug, data, body) => ({
    type: "news",
    slug,
    title: text(data.title, slug),
    date: text(data.date),
    source: text(data.source),
    url: text(data.url),
    summary: text(data.summary),
    comment: text(data.comment) || undefined,
    tags: list(data.tags),
    pinned: bool(data.pinned),
    body
  })).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));
}

export function getProjects() {
  return readCollection<Project>("projects", (slug, data, body) => ({
    type: "project",
    slug: text(data.slug, slug),
    name: text(data.name, slug),
    summary: text(data.summary),
    status: text(data.status, "experiment") as Project["status"],
    tech: list(data.tech),
    demoUrl: text(data.demoUrl) || undefined,
    repoUrl: text(data.repoUrl) || undefined,
    featured: bool(data.featured),
    body
  })).sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
}

export function getBlogPost(slug: string) {
  return getBlogPosts().find((post) => post.slug === slug);
}

export function getAllTags() {
  const tags = new Set<string>();
  for (const item of [...getBlogPosts(), ...getNewsItems()]) {
    item.tags.forEach((tag) => tags.add(tag));
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

const calloutNames = ["primary", "info", "warning", "danger", "success", "note", "tip"];

for (const name of calloutNames) {
  md.use(markdownItContainer, name, {
    validate(params: string) {
      return params.trim().split(/\s+/)[0] === name;
    },
    render(tokens: { nesting: number; info: string }[], index: number) {
      const token = tokens[index];
      if (token.nesting === 1) {
        const classes = token.info
          .trim()
          .split(/\s+/)
          .slice(1)
          .filter(Boolean)
          .map((item) => `md-callout--${escapeHtml(item)}`)
          .join(" ");
        return `<aside class="md-callout md-callout--${name}${classes ? ` ${classes}` : ""}">\n`;
      }
      return "</aside>\n";
    }
  });
}

md.use(markdownItAnchor, {
  permalink: false,
  slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "");
  }
});
md.use(markdownItAttrs, {
  allowedAttributes: ["class", "id", "target", "rel"]
});
md.use(markdownItMark);
md.use(markdownItEmoji);

const defaultRender =
  md.renderer.rules.link_open ||
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = tokens[index].attrGet("href") || "";
  if (/^https?:\/\//.test(href)) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noreferrer");
  }
  return defaultRender(tokens, index, options, env, self);
};

function legacyClassList(input: string) {
  return input
    .split(/\s+/)
    .map((item) => item.replace(/^\./, ""))
    .filter(Boolean)
    .map((item) => `md-${escapeHtml(item)}`)
    .join(" ");
}

function transformLegacyInline(line: string) {
  return line
    .replace(/\[([^\]\n]+)\]\.?\{([^}\n]+)\}/g, (_, label: string, classes: string) => {
      return `<span class="md-accent ${legacyClassList(classes)}">${escapeHtml(label)}</span>`;
    })
    .replace(/\+\+([^+\n]+)\+\+(?:\{([^}\n]+)\})?/g, (_, label: string, classes = "") => {
      const className = classes ? ` class="${legacyClassList(classes)}"` : "";
      return `<strong${className}>${escapeHtml(label)}</strong>`;
    })
    .replace(/\{%\s*asset_img\s+([^%]+?)\s*%\}/g, (_, assetName: string) => {
      const cleanName = String(assetName).trim();
      const src = `/legacy-assets/${encodeURIComponent(cleanName)}`;
      return `<img src="${src}" alt="${escapeHtml(cleanName)}" class="md-asset-image" />`;
    });
}

function preprocessMarkdown(markdown: string) {
  let inFence = false;

  return markdown
    .split("\n")
    .map((line) => {
      if (/^(```|~~~)/.test(line.trim())) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return transformLegacyInline(line);
    })
    .join("\n");
}

export function markdownToHtml(markdown: string) {
  return md.render(preprocessMarkdown(markdown));
}
