function decodeHtml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readTag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return stripTags(match[1]);
  }
  return "";
}

function readLink(block) {
  const atomLink = block.match(/<link\b([^>]*)\/?>/i);
  const href = atomLink?.[1]?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  return href ? decodeHtml(href).trim() : readTag(block, ["link", "guid", "id"]);
}

function readPublishedAt(block, now) {
  const value = readTag(block, ["pubDate", "published", "updated", "dc:date"]);
  const publishedAt = value ? new Date(value) : new Date(now);
  return Number.isNaN(publishedAt.getTime()) ? new Date(now).toISOString() : publishedAt.toISOString();
}

function truncate(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}...`;
}

export function parseFeed(xml, source, now = new Date()) {
  const blocks = [
    ...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...String(xml).matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
  ].map((match) => match[1]);

  return blocks.map((block) => {
    const title = readTag(block, ["title"]);
    const url = readLink(block);
    const summary = readTag(block, ["description", "summary", "content:encoded", "content"]);
    return {
      title,
      url,
      summary: truncate(summary || title, 320),
      publishedAt: readPublishedAt(block, now),
      source: source.name,
      tags: source.tags || [],
      weight: source.weight ?? 1
    };
  }).filter((item) => item.title && /^https?:\/\//.test(item.url));
}

export async function fetchSources(sources, options) {
  const results = await Promise.allSettled(sources.map(async (source) => {
    let error;
    for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
      try {
        const response = await options.fetchImpl(source.url, {
          headers: { "user-agent": "Pixel-Map-NewsBot/2.0 (+https://github.com/Teosttn/Pixel-Map)" },
          signal: AbortSignal.timeout(options.timeoutMs)
        });
        if (!response.ok) throw new Error(`${source.name} returned ${response.status}`);
        return parseFeed(await response.text(), source, options.now);
      } catch (caught) {
        error = caught;
      }
    }
    throw new Error(error instanceof Error ? error.message : String(error));
  }));

  return results.reduce((output, result, index) => {
    if (result.status === "fulfilled") output.items.push(...result.value);
    else output.failures.push({ source: sources[index].name, message: result.reason.message });
    return output;
  }, { items: [], failures: [] });
}
