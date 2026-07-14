import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtime = readFileSync("src/components/motion/MotionRuntime.tsx", "utf8");
const css = readFileSync("src/styles/globals.css", "utf8");
const canvas = readFileSync("src/components/pixel/PixelMapCanvas.tsx", "utf8");

assert.doesNotMatch(runtime, /querySelectorAll\([\s\S]*?\.prose/);
assert.doesNotMatch(css, /gradient/i, "the visual system uses solid pixel colors only");
assert.match(css, /data-route-phase="leaving"/);
assert.match(css, /data-route-phase="entering"/);
assert.match(css, /data-route-phase="entering"[\s\S]*?route-arrive 300ms/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /\.pixel-map-canvas\s*\{[^}]*display:\s*none/);
assert.match(canvas, /ResizeObserver/);
assert.match(canvas, /visibilitychange/);

for (const match of css.matchAll(/(?:animation|transition):[^;]*?\b(\d+(?:\.\d+)?)(ms|s)\b/g)) {
  const duration = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  assert.ok(duration <= 12000, `motion duration ${match[0]} exceeds 12 seconds`);
}
