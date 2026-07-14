import type { CSSProperties } from "react";
import Link from "next/link";
import { Bilingual } from "@/components/content/Bilingual";
import type { MapTab } from "./isometric";
import type { RenderedLandmark } from "./isometric-renderer";
import { TabIcon } from "./TabIcon";

type MapNodeProps = MapTab & {
  icon?: string;
  position?: RenderedLandmark;
  active: boolean;
  onActiveChange: (active: boolean) => void;
};

export function MapNode({
  href,
  color,
  label,
  title,
  zhTitle,
  icon,
  position,
  active,
  onActiveChange
}: MapNodeProps) {
  return (
    <Link
      className="map-node"
      href={href}
      style={
        {
          "--node-x": `${position?.x ?? 0}px`,
          "--node-y": `${position?.y ?? 0}px`,
          "--node-color": color
        } as CSSProperties
      }
      data-landmark={label}
      data-active={active}
      data-transition-origin="map"
      data-transition-theme={color}
      onPointerEnter={() => onActiveChange(true)}
      onPointerLeave={() => onActiveChange(false)}
      onPointerDown={() => onActiveChange(true)}
      onFocus={() => onActiveChange(true)}
      onBlur={() => onActiveChange(false)}
    >
      <span className="map-node__beacon" aria-hidden="true">
        <TabIcon name={icon} />
      </span>
      <span className="map-node__label">
        <Bilingual zh={zhTitle} en={title} />
      </span>
    </Link>
  );
}
