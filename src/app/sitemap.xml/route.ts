import { getAllTags, getBlogPosts } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export function GET() {
  const routes = ["/", "/blog", "/news", "/projects", "/about", "/lab"];
  const blogRoutes = getBlogPosts().map((post) => `/blog/${post.slug}`);
  const tagRoutes = getAllTags().map((tag) => `/tags/${encodeURIComponent(tag)}`);
  const urls = [...routes, ...blogRoutes, ...tagRoutes]
    .map((route) => `<url><loc>${absoluteUrl(route)}</loc></url>`)
    .join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: {
      "content-type": "application/xml; charset=utf-8"
    }
  });
}
