import type { Metadata } from "next";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelCard } from "@/components/content/PixelCard";
import { Tags } from "@/components/content/Tags";
import { getNewsItems } from "@/lib/content";

export const metadata: Metadata = {
  title: "News",
  description: "Curated signals, links, and short comments."
};

export default function NewsPage() {
  const items = getNewsItems();

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
        {items.map((item) => (
          <PixelCard key={item.slug} accent={item.pinned ? "var(--amber-glow)" : "var(--signal-cyan)"}>
            <p className="meta">
              {item.pinned ? "PINNED / " : ""}
              {item.date} / {item.source}
            </p>
            <h2 className="article-title">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </h2>
            {item.comment ? <p className="article-summary">{item.comment}</p> : null}
            <p className="article-summary">{item.summary}</p>
            <Tags tags={item.tags} />
          </PixelCard>
        ))}
      </section>
    </main>
  );
}
