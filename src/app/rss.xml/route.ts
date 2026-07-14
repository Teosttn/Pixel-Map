import { getBlogPosts, getNewsDigests } from "@/lib/content";
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
  const items = [
    ...getBlogPosts().map((post) => ({
      title: post.title,
      date: post.date,
      summary: post.summary,
      url: absoluteUrl(`/blog/${post.slug}`)
    })),
    ...getNewsDigests().map((digest) => ({
      title: digest.titleEn,
      date: digest.date,
      summary: digest.summaryEn,
      url: absoluteUrl(`/news/${digest.slug}`)
    }))
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) => {
      return `<item>
  <title>${escapeXml(item.title)}</title>
  <link>${item.url}</link>
  <guid>${item.url}</guid>
  <pubDate>${new Date(item.date).toUTCString()}</pubDate>
  <description>${escapeXml(item.summary)}</description>
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
