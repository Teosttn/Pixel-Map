"use client";

import { useEffect, useMemo, useRef } from "react";
import { createWorld, type MapTab } from "./isometric";
import { drawWorld, type RenderedLandmark } from "./isometric-renderer";

export type PixelMapCanvasProps = {
  tabs: MapTab[];
  activeId: string | null;
  pointer: { x: number; y: number } | null;
  onLayout?: (landmarks: RenderedLandmark[]) => void;
};

const WORLD_SIZE = 14;

export function PixelMapCanvas({ tabs, activeId, pointer, onLayout }: PixelMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputsRef = useRef({ activeId, pointer, onLayout });
  const layoutRef = useRef("");
  const tabKey = tabs.map((tab) => tab.id).join(":");
  const world = useMemo(() => createWorld(2907, tabs, WORLD_SIZE), [tabs]);

  inputsRef.current = { activeId, pointer, onLayout };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let lastDraw = 0;
    let hidden = document.hidden;

    const render = (now = performance.now()) => {
      if (hidden) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.floor(width * ratio);
      const targetHeight = Math.floor(height * ratio);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const tileWidth = Math.max(24, Math.min(62, (width * 0.8) / (WORLD_SIZE - 1)));
      const metrics = {
        originX: width / 2,
        originY: Math.max(92, height * 0.19),
        tileWidth,
        tileHeight: Math.round(tileWidth / 2),
        levelHeight: Math.max(7, Math.round(tileWidth * 0.22))
      };
      const inputs = inputsRef.current;
      const layout = drawWorld(context, world, {
        width,
        height,
        size: WORLD_SIZE,
        metrics,
        tabs,
        activeId: inputs.activeId,
        pointer: inputs.pointer,
        time: reduced ? 0 : now,
        devicePixelRatio: ratio
      });
      const signature = layout.map((landmark) => `${landmark.id}:${Math.round(landmark.x)}:${Math.round(landmark.y)}`).join("|");
      if (signature !== layoutRef.current) {
        layoutRef.current = signature;
        inputs.onLayout?.(layout);
      }
    };

    const tick = (now: number) => {
      if (now - lastDraw >= 33) {
        lastDraw = now;
        render(now);
      }
      if (!reduced && !hidden) frame = window.requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);
    const onVisibilityChange = () => {
      hidden = document.hidden;
      if (!hidden) {
        render();
        if (!reduced) frame = window.requestAnimationFrame(tick);
      }
    };

    render();
    if (!reduced) frame = window.requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.cancelAnimationFrame(frame);
    };
  }, [tabKey, tabs, world]);

  return <canvas className="pixel-map-canvas" ref={canvasRef} aria-hidden="true" />;
}
