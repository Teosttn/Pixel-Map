"use client";

import { useEffect, useMemo, useState } from "react";
import { Bilingual } from "@/components/content/Bilingual";
import type { MapTab } from "./isometric";
import { MapNode } from "./MapNode";
import { PixelMapCanvas } from "./PixelMapCanvas";
import type { RenderedLandmark } from "./isometric-renderer";

type IsometricMapProps = { tabs: MapTab[] };

export function IsometricMap({ tabs }: IsometricMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [layout, setLayout] = useState<RenderedLandmark[]>(() =>
    tabs.map((tab, index) => ({
      id: tab.id,
      x: 56 + index * 18,
      y: 170 + index * 44,
      width: 44,
      height: 44,
      color: tab.color
    }))
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const landmarkById = useMemo(() => new Map(layout.map((landmark) => [landmark.id, landmark])), [layout]);

  return (
    <section
      className="home-map"
      aria-label="Pixel map navigation"
      data-reduced-motion={reducedMotion}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      onPointerLeave={() => setPointer(null)}
    >
      <PixelMapCanvas tabs={tabs} activeId={activeId} pointer={pointer} onLayout={setLayout} />
      <div className="home-map__content">
        <div className="home-map__title">
          <h1>Pixel-Map</h1>
          <p className="home-map__kind">
            <Bilingual zh="个人网站" en="Personal Site" />
          </p>
        </div>
        <div className="node-field">
          {tabs.map((tab) => (
            <MapNode
              key={tab.id}
              {...tab}
              position={landmarkById.get(tab.id)}
              active={activeId === tab.id}
              onActiveChange={(active) => setActiveId(active ? tab.id : null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
