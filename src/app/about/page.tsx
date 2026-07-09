import type { Metadata } from "next";
import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelCard } from "@/components/content/PixelCard";

export const metadata: Metadata = {
  title: "About",
  description: "Bio, skills, timeline, and contact details."
};

const skills = [
  ["Frontend", "React, interface systems, motion, content-heavy products"],
  ["Backend", "APIs, data modeling, publishing workflows, automation"],
  ["AI", "Agent workflows, evaluation loops, product integration"],
  ["Design", "Information architecture, interaction detail, visual direction"],
  ["Writing", "Technical essays, notes, curation, product thinking"]
];

const timeline = [
  ["Now", "Building Pixel-Map as a personal site."],
  ["Recent", "Collecting product, AI, and frontend notes into durable writing."],
  ["Always", "Trying to make technical systems feel clearer and more humane."]
];

export default function AboutPage() {
  return (
    <main className="page">
      <p className="eyebrow">
        <Bilingual zh="档案小屋" en="archive house" />
      </p>
      <h1 className="page-title">
        <Bilingual zh="关于我" en="About" />
      </h1>
      <p className="lede">
        <Bilingual
          zh="我构建界面、记录思考，也把模糊的想法整理成可以探索、交付和维护的系统。"
          en="I build interfaces, write notes, and turn fuzzy ideas into systems that can be explored, shipped, and maintained."
        />
      </p>
      <section className="grid grid--two" style={{ marginTop: 34 }}>
        <PixelCard accent="var(--rose-alert)">
          <h2 className="article-title">Profile</h2>
          <p className="article-summary">
            Pixel-Map is the front door for my writing and work. It favors recognizable places over
            generic sections: a library for essays, a tower for signals, a workshop for projects,
            and a lab for experiments.
          </p>
          <div className="tag-row">
            <a className="pixel-button" href="mailto:hello@example.com">
              Email
            </a>
            <Link className="pixel-button" href="/rss.xml">
              RSS
            </Link>
          </div>
        </PixelCard>
        <PixelCard accent="var(--pixel-green)">
          <h2 className="article-title">Skill Map</h2>
          <div className="timeline">
            {skills.map(([name, body]) => (
              <div className="timeline-item" key={name}>
                <strong className="meta">{name}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </PixelCard>
      </section>
      <section style={{ marginTop: 18 }}>
        <PixelCard accent="var(--signal-cyan)">
          <h2 className="article-title">Timeline</h2>
          <div className="timeline">
            {timeline.map(([date, body]) => (
              <div className="timeline-item" key={date}>
                <strong className="meta">{date}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </PixelCard>
      </section>
    </main>
  );
}
