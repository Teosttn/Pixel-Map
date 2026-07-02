"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BlogPost } from "@/lib/content";
import { PixelCard } from "./PixelCard";
import { Tags } from "./Tags";

export function SearchablePosts({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const tags = useMemo(() => ["all", ...Array.from(new Set(posts.flatMap((post) => post.tags))).sort()], [posts]);
  const normalized = query.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const matchesTag = activeTag === "all" || post.tags.includes(activeTag);
    const haystack = `${post.title} ${post.summary} ${post.tags.join(" ")} ${post.category}`.toLowerCase();
    return matchesTag && (!normalized || haystack.includes(normalized));
  });

  return (
    <div className="content-layout">
      <aside className="filter-panel" aria-label="Blog filters">
        <input
          className="search-box"
          placeholder="search posts..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="tag-row">
          {tags.map((tag) => (
            <button
              className="tag"
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                color: activeTag === tag ? "var(--base-ink)" : undefined,
                background: activeTag === tag ? "var(--pixel-green)" : undefined
              }}
              type="button"
            >
              {tag === "all" ? "all" : `#${tag}`}
            </button>
          ))}
        </div>
      </aside>
      <section className="article-list" aria-live="polite" key={`${activeTag}-${normalized ? "search" : "all"}`}>
        {filtered.map((post) => (
          <PixelCard key={post.slug} accent="var(--pixel-green)">
            <p className="meta">
              {post.date} / {post.category} / {post.readingTime}
            </p>
            <h2 className="article-title">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="article-summary">{post.summary}</p>
            <Tags tags={post.tags} />
          </PixelCard>
        ))}
        {!filtered.length ? <p className="lede">No entries match this filter.</p> : null}
      </section>
    </div>
  );
}
