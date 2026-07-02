import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelMapCanvas } from "@/components/pixel/PixelMapCanvas";
import { MapNode } from "@/components/pixel/MapNode";
import { getBlogPosts, getNewsItems, getProjects } from "@/lib/content";
import { mapNodes } from "@/lib/site";

export default function HomePage() {
  const [post] = getBlogPosts();
  const [news] = getNewsItems();
  const [project] = getProjects();

  return (
    <main>
      <section className="home-map" aria-label="Pixel map navigation">
        <PixelMapCanvas />
        <div className="home-map__content">
          <div className="home-map__title">
            <p className="eyebrow">
              <Bilingual zh="个人内容地图" en="personal content atlas" />
            </p>
            <h1>Pixel-Map</h1>
            <p>
              <Bilingual
                zh="一个可探索的个人内容世界，用来承载长文、精选资讯、项目作品和小实验。"
                en="A navigable personal world for long notes, curated signals, shipped work, and small experiments."
              />
            </p>
          </div>
          <div className="node-field">
            {mapNodes.map((node) => (
              <MapNode key={node.id} {...node} />
            ))}
          </div>
          <div className="home-preview" aria-label="Latest content">
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
          </div>
        </div>
      </section>
    </main>
  );
}
