import type { Metadata } from "next";
import { Bilingual } from "@/components/content/Bilingual";
import { SearchablePosts } from "@/components/content/SearchablePosts";
import { getBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Essays, technical logs, and design notes from Pixel-Map."
};

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <main className="page">
      <p className="eyebrow">
        <Bilingual zh="档案图书馆" en="archive library" />
      </p>
      <h1 className="page-title">
        <Bilingual zh="博客" en="Blog" />
      </h1>
      <p className="lede">
        <Bilingual
          zh="长文、技术笔记和设计记录。支持标签筛选、搜索和 Markdown 发布。"
          en="Long-form notes with tags, search, readable article pages, and a publishing path that stays close to Markdown."
        />
      </p>
      <SearchablePosts posts={posts} />
    </main>
  );
}
