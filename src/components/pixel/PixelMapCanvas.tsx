"use client";

import { useEffect, useRef } from "react";

export function PixelMapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let raf = 0;
    let lastDraw = 0;
    let pointer = { x: 0.5, y: 0.45, activeAt: 0 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now = performance.now()) => {
      if (now - lastDraw < 42) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const tile = width < 700 ? 18 : 26;
      const pointerActive = now - pointer.activeAt < 1400;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#101214";
      context.fillRect(0, 0, width, height);

      const palette = [
        "122, 203, 121",
        "97, 199, 212",
        "242, 184, 75",
        "226, 103, 115",
        "139, 123, 216",
        "231, 223, 202"
      ];

      for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
          const px = x / width - pointer.x;
          const py = y / height - pointer.y;
          const distance = Math.sqrt(px * px + py * py);
          const hoverPulse = pointerActive ? Math.max(0, 1 - distance * 4.8) : 0;
          const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          const rareBlink = Math.sin(now * 0.00072 + seed * 18) > 0.997 ? 1 : 0;
          const paletteIndex = Math.abs(Math.floor((x / tile) * 3 + (y / tile) * 5 + seed * palette.length)) % palette.length;
          const alpha = 0.026 + hoverPulse * 0.18 + rareBlink * 0.2;
          const block = Math.max(3, tile * (rareBlink ? 0.48 : hoverPulse > 0.1 ? 0.42 : 0.28));
          context.fillStyle = `rgba(${palette[paletteIndex]}, ${Math.min(alpha, 0.32)})`;
          context.fillRect(x, y, block, block);
        }
      }

      const signals = [
        [0.29, 0.46, "122, 203, 121"],
        [0.63, 0.33, "97, 199, 212"],
        [0.56, 0.63, "242, 184, 75"],
        [0.78, 0.5, "226, 103, 115"],
        [0.42, 0.25, "139, 123, 216"]
      ];

      for (const [sx, sy, rgb] of signals) {
        const x = Number(sx) * width;
        const y = Number(sy) * height;
        const radius = 20 + Math.sin(now * 0.0008 + x) * 4;
        context.fillStyle = `rgba(${rgb}, ${pointerActive ? 0.12 : 0.07})`;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        context.fillStyle = `rgba(${rgb}, ${pointerActive ? 0.42 : 0.26})`;
        context.fillRect(x - 5, y - 5, 10, 10);
      }

      frame += 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        activeAt: performance.now()
      };
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas className="pixel-map-canvas" ref={canvasRef} aria-hidden="true" />;
}
