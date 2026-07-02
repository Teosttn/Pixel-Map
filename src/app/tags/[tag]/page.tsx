import type { Metadata } from "next";
import Link from "next/link";
import { PixelCard } from "@/components/content/PixelCard";
import { Tags } from "@/components/content/Tags";
import { getAllTags, getBlogPosts, getNewsItems } from "@/lib/content";

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag }));
}

export function generateMetadata({ params }: { params: { tag: string } }): Metadata {
  const tag = decodeURIComponent(params.tag);
  return {
    title: `#${tag}`,
    description: `Content tagged ${tag} on Pixel-Map.`
  };
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const posts = getBlogPosts().filter((post) => post.tags.includes(tag));
  const news = getNewsItems().filter((item) => item.tags.includes(tag));

  return (
    <main className="page">
      <Link className="pixel-button" href="/blog">
        Back
      </Link>
      <p className="eyebrow" style={{ marginTop: 34 }}>
        tag signal
      </p>
      <h1 className="page-title">#{tag}</h1>
      <section className="article-list" style={{ marginTop: 34 }}>
        {posts.map((post) => (
          <PixelCard key={post.slug} accent="var(--pixel-green)">
            <p className="meta">
              Blog / {post.date} / {post.readingTime}
            </p>
            <h2 className="article-title">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="article-summary">{post.summary}</p>
            <Tags tags={post.tags} />
          </PixelCard>
        ))}
        {news.map((item) => (
          <PixelCard key={item.slug} accent="var(--signal-cyan)">
            <p className="meta">
              News / {item.date} / {item.source}
            </p>
            <h2 className="article-title">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </h2>
            <p className="article-summary">{item.summary}</p>
            <Tags tags={item.tags} />
          </PixelCard>
        ))}
      </section>
    </main>
  );
}
