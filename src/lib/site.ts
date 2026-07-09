import tabsConfig from "@/content/config/tabs.json";

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
  nav: tabsConfig.nav
};

export const mapNodes = tabsConfig.mapNodes;
