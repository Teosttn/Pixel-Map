import type { Metadata } from "next";
import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";
import { PixelCard } from "@/components/content/PixelCard";

export const metadata: Metadata = {
  title: "Lab",
  description: "Interactive demos and future Pixel-Map modules."
};

export default function LabPage() {
  return (
    <main className="page">
      <p className="eyebrow">
        <Bilingual zh="传送门实验室" en="portal lab" />
      </p>
      <h1 className="page-title">
        <Bilingual zh="实验室" en="Lab" />
      </h1>
      <p className="lede">
        <Bilingual
          zh="小型 demo、未来模块和交互实验的暂存区，成熟后再成为地图上的常驻节点。"
          en="A small staging area for demos, future modules, and interface experiments before they earn a permanent place on the map."
        />
      </p>
      <section className="grid grid--three" style={{ marginTop: 34 }}>
        {[
          ["Guestbook", "A lightweight place for visitors to leave notes."],
          ["Now Page", "Current focus, reading, experiments, and small logs."],
          ["Toolbox", "Tiny utilities that fit the personal-site world."]
        ].map(([title, body]) => (
          <PixelCard key={title} accent="var(--muted-violet)">
            <h2 className="article-title">{title}</h2>
            <p className="article-summary">{body}</p>
            <Link className="pixel-button" href="/">
              Map
            </Link>
          </PixelCard>
        ))}
      </section>
    </main>
  );
}
