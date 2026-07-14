import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bilingual } from "@/components/content/Bilingual";
import { Tags } from "@/components/content/Tags";
import { getNewsDigest, getNewsDigests, markdownToHtml } from "@/lib/content";

export function generateStaticParams() {
  return getNewsDigests().map((digest) => ({ slug: digest.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const digest = getNewsDigest(params.slug);
  if (!digest) return {};

  return {
    title: digest.titleEn,
    description: digest.summaryEn,
    openGraph: {
      title: digest.titleEn,
      description: digest.summaryEn,
      type: "article",
      publishedTime: digest.date,
      tags: digest.tags
    }
  };
}

export default function NewsDigestPage({ params }: { params: { slug: string } }) {
  const digest = getNewsDigest(params.slug);
  if (!digest) notFound();

  return (
    <main className="page page--narrow">
      <Link className="pixel-button" href="/news">
        <Bilingual zh="返回资讯" en="Back to News" />
      </Link>
      <header style={{ margin: "34px 0 24px" }}>
        <p className="eyebrow">{digest.date}</p>
        <h1 className="page-title">
          <Bilingual zh={digest.titleZh} en={digest.titleEn} />
        </h1>
        <p className="lede">
          <Bilingual zh={digest.summaryZh} en={digest.summaryEn} />
        </p>
        <p className="meta">{digest.itemCount} items / {digest.sources.join(", ")}</p>
        <Tags tags={digest.tags} />
      </header>
      <article className="prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(digest.body) }} />
    </main>
  );
}
