import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tags } from "@/components/content/Tags";
import { getBlogPost, getBlogPosts, markdownToHtml } from "@/lib/content";

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.date,
      tags: post.tags
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <main className="page page--narrow">
      <Link className="pixel-button" href="/blog">
        Back to Blog
      </Link>
      <header style={{ margin: "34px 0 24px" }}>
        <p className="eyebrow">{post.category}</p>
        <h1 className="page-title">{post.title}</h1>
        <p className="lede">{post.summary}</p>
        <p className="meta">
          {post.date} / {post.readingTime}
        </p>
        <Tags tags={post.tags} />
      </header>
      <article className="prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(post.body) }} />
    </main>
  );
}
