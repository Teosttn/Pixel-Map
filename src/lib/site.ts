const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://pixel-map.local").replace(/\/$/, "");

export function withBasePath(href: string) {
  if (!href.startsWith("/")) return href;
  if (href === "/") return basePath || "/";
  return `${basePath}${href}`;
}

export function absoluteUrl(href: string) {
  if (!href.startsWith("/")) return href;
  const relativeHref = href === "/" ? "" : href.slice(1);
  return new URL(relativeHref, `${siteUrl}/`).toString();
}

export const siteConfig = {
  name: "Pixel-Map",
  url: siteUrl,
  basePath,
  description:
    "A pixel-styled personal map for essays, curated signals, projects, and field notes.",
  author: "Pixel Cartographer",
  nav: [
    { label: "Blog", zh: "博客", href: "/blog" },
    { label: "News", zh: "资讯", href: "/news" },
    { label: "Projects", zh: "项目", href: "/projects" },
    { label: "About", zh: "关于", href: "/about" },
    { label: "Lab", zh: "实验室", href: "/lab" }
  ]
};

export const mapNodes = [
  {
    id: "blog",
    label: "Blog",
    href: "/blog",
    x: 29,
    y: 46,
    color: "var(--pixel-green)",
    glyph: "B",
    title: "Archive Library",
    zhTitle: "档案图书馆",
    description: "Essays, notes, technical logs",
    zhDescription: "文章、笔记、技术记录"
  },
  {
    id: "news",
    label: "News",
    href: "/news",
    x: 63,
    y: 33,
    color: "var(--signal-cyan)",
    glyph: "N",
    title: "Signal Tower",
    zhTitle: "信号塔",
    description: "Curated updates and short takes",
    zhDescription: "精选资讯与短评"
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    x: 56,
    y: 63,
    color: "var(--amber-glow)",
    glyph: "P",
    title: "Workshop",
    zhTitle: "工坊",
    description: "Built things, experiments, and shipped ideas",
    zhDescription: "项目作品、实验与交付记录"
  },
  {
    id: "about",
    label: "About",
    href: "/about",
    x: 78,
    y: 50,
    color: "var(--rose-alert)",
    glyph: "A",
    title: "Archive House",
    zhTitle: "档案小屋",
    description: "Bio, skills, timeline, contact",
    zhDescription: "简介、技能、时间线、联系"
  },
  {
    id: "lab",
    label: "Lab",
    href: "/lab",
    x: 42,
    y: 25,
    color: "var(--muted-violet)",
    glyph: "L",
    title: "Portal Lab",
    zhTitle: "传送门实验室",
    description: "Small interactive demos and future modules",
    zhDescription: "小型互动 demo 与未来模块"
  }
] as const;
