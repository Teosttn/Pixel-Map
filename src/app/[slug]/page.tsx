import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bilingual } from "@/components/content/Bilingual";
import { getCustomPage, markdownToHtml } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export function generateStaticParams() {
  const pages = siteConfig.tabs.filter((tab) => tab.kind === "page" && tab.visible).map((tab) => ({ slug: tab.href.slice(1) }));
  return pages.length ? pages : [{ slug: "__pixel-map-unconfigured" }];
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getCustomPage(params.slug);
  return page ? { title: page.title, description: page.summary } : {};
}

export default function CustomPage({ params }: { params: { slug: string } }) {
  const page = getCustomPage(params.slug);
  if (!page) notFound();
  return <main className="page page--narrow"><p className="eyebrow"><Bilingual zh={page.titleZh} en={page.titleEn} /></p><article className="prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(page.body) }} /></main>;
}
