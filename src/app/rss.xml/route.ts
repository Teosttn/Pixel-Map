import { getBlogPosts } from "@/lib/content";
import { absoluteUrl, siteConfig } from "@/lib/site";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = getBlogPosts()
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <pubDate>${new Date(post.date).toUTCString()}</pubDate>
  <description>${escapeXml(post.summary)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>${escapeXml(siteConfig.name)}</title>
  <link>${siteConfig.url}</link>
  <description>${escapeXml(siteConfig.description)}</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8"
    }
  });
}
