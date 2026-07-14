import type { Metadata } from "next";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelCard } from "@/components/content/PixelCard";
import { Tags } from "@/components/content/Tags";
import Link from "next/link";
import { getNewsDigests } from "@/lib/content";

export const metadata: Metadata = {
  title: "News",
  description: "Daily bilingual technical-news digests."
};

export default function NewsPage() {
  const digests = getNewsDigests();

  return (
    <main className="page">
      <p className="eyebrow">
        <Bilingual zh="信号塔" en="signal tower" />
      </p>
      <h1 className="page-title">
        <Bilingual zh="资讯" en="News" />
      </h1>
      <p className="lede">
        <Bilingual
          zh="值得留下的链接与短评：标题、来源、摘要和个人判断，而不是无尽信息流。"
          en="A curated stream for links worth keeping: title, source, short summary, and a personal comment instead of an endless feed."
        />
      </p>
      <section className="timeline">
        {digests.map((digest) => (
          <PixelCard key={digest.slug} accent="var(--signal-cyan)">
            <p className="meta">
              {digest.date} / {digest.itemCount} items / {digest.sources.join(", ")}
            </p>
            <h2 className="article-title">
              <Link href={`/news/${digest.slug}`}>
                <Bilingual zh={digest.titleZh} en={digest.titleEn} />
              </Link>
            </h2>
            <p className="article-summary">
              <Bilingual zh={digest.summaryZh} en={digest.summaryEn} />
            </p>
            <p>
              <Link className="pixel-button" href={`/news/${digest.slug}`}>
                <Bilingual zh="阅读摘要" en="Read digest" />
              </Link>
            </p>
            <Tags tags={digest.tags} />
          </PixelCard>
        ))}
      </section>
    </main>
  );
}
