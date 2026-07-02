import type { CSSProperties } from "react";
import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";

type MapNodeProps = {
  href: string;
  x: number;
  y: number;
  color: string;
  glyph: string;
  label: string;
  title: string;
  zhTitle: string;
  description: string;
  zhDescription: string;
};

export function MapNode({
  href,
  x,
  y,
  color,
  glyph,
  label,
  title,
  zhTitle,
  description,
  zhDescription
}: MapNodeProps) {
  return (
    <Link
      className="map-node"
      href={href}
      style={{ left: `${x}%`, top: `${y}%`, "--node-color": color } as CSSProperties}
    >
      <span className="map-node__beacon" aria-hidden="true">
        {glyph}
      </span>
      <span className="map-node__label">
        <strong>{label}</strong>
        <small>
          <Bilingual zh={zhTitle} en={title} />
        </small>
        <em>
          <Bilingual zh={zhDescription} en={description} />
        </em>
      </span>
    </Link>
  );
}
