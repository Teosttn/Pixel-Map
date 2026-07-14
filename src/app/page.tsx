import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";
import { IsometricMap } from "@/components/pixel/IsometricMap";
import { getBlogPosts, getNewsDigests, getProjects } from "@/lib/content";
import { mapNodes } from "@/lib/site";

export default function HomePage() {
  const [post] = getBlogPosts();
  const [news] = getNewsDigests();
  const [project] = getProjects();

  return (
    <main>
      <IsometricMap tabs={mapNodes} />
      <section className="home-preview" aria-label="Latest content">
        {post ? (
          <Link href={`/blog/${post.slug}`}>
            <strong>
              <Bilingual zh="最新文章" en="Latest Post" />
            </strong>
            <span>{post.title}</span>
          </Link>
        ) : null}
        {news ? (
          <Link href="/news">
            <strong>
              <Bilingual zh="精选资讯" en="Signal" />
            </strong>
            <span>{news.title}</span>
          </Link>
        ) : null}
        {project ? (
          <Link href="/projects">
            <strong>
              <Bilingual zh="项目作品" en="Project" />
            </strong>
            <span>{project.name}</span>
          </Link>
        ) : null}
      </section>
    </main>
  );
}
