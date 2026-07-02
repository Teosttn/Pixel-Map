import type { Metadata } from "next";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelCard } from "@/components/content/PixelCard";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Project cards, status, links, and technology stack."
};

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <main className="page">
      <p className="eyebrow">
        <Bilingual zh="工坊" en="workshop" />
      </p>
      <h1 className="page-title">
        <Bilingual zh="项目作品" en="Projects" />
      </h1>
      <p className="lede">
        <Bilingual
          zh="展示进行中的构建、归档作品和可能成为地图节点的实验。"
          en="A compact workshop wall for active builds, archived work, and experiments that may become permanent map nodes later."
        />
      </p>
      <section className="grid grid--two" style={{ marginTop: 34 }}>
        {projects.map((project) => (
          <PixelCard
            key={project.slug}
            accent={project.featured ? "var(--amber-glow)" : "var(--muted-violet)"}
          >
            <p className="meta">
              {project.featured ? "FEATURED / " : ""}
              {project.status.toUpperCase()}
            </p>
            <h2 className="article-title">{project.name}</h2>
            <p className="article-summary">{project.summary}</p>
            <div className="tag-row">
              {project.tech.map((tech) => (
                <span className="tag" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
            <div className="tag-row" style={{ marginTop: 18 }}>
              {project.demoUrl ? (
                <a className="pixel-button" href={project.demoUrl}>
                  Demo
                </a>
              ) : null}
              {project.repoUrl ? (
                <a className="pixel-button" href={project.repoUrl} target="_blank" rel="noreferrer">
                  Repo
                </a>
              ) : null}
            </div>
          </PixelCard>
        ))}
      </section>
    </main>
  );
}
