const TRACKING_KEYS = new Set(["fbclid", "gclid", "ref", "source", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"]);

export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function canonicalUrl(value) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_KEYS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  url.searchParams.sort();
  return url.toString().replace(/\?$/, "");
}

export function normalizeTitle(value) {
  return String(value).toLowerCase()
    .replace(/\b(is )?now available\b|\breleased\b|\bintroducing\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").replace(/\s+/g, " ").trim();
}

export function selectFreshItems(items, options) {
  const minimum = options.now.getTime() - options.maxAgeHours * 60 * 60 * 1000;
  const urls = new Set();
  const titles = new Set();
  return items
    .filter((item) => {
      const timestamp = new Date(item.publishedAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= minimum && timestamp <= options.now.getTime() + 15 * 60 * 1000;
    })
    .map((item) => {
      const url = canonicalUrl(item.url);
      const keywordScore = options.topicKeywords.filter((keyword) => `${item.title} ${item.summary}`.toLowerCase().includes(keyword.toLowerCase())).length;
      const freshness = Math.max(0, 1 - (options.now.getTime() - new Date(item.publishedAt).getTime()) / (options.maxAgeHours * 60 * 60 * 1000));
      return { ...item, url, score: Number(item.weight ?? 1) + keywordScore + freshness };
    })
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item) => {
      const title = normalizeTitle(item.title);
      if (options.seenUrls.has(item.url.toLowerCase()) || urls.has(item.url) || titles.has(title)) return false;
      urls.add(item.url);
      titles.add(title);
      return true;
    })
    .slice(0, options.maxItems);
}
