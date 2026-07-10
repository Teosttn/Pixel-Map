# Isometric Pixel Map and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the home navigation into a responsive 2.5D isometric pixel map and give internal tab navigation one coherent depth transition.

**Architecture:** Render deterministic terrain and landmarks with a lightweight Canvas 2D isometric engine while retaining semantic HTML links as the accessible interaction layer. Coordinate internal navigation through one client provider that handles bounded exit/entry states and reduced-motion fallback.

**Tech Stack:** React 18, Next.js 14 App Router, Canvas 2D, TypeScript, CSS 3D transforms, built-in Node tests, in-app browser acceptance.

## Global Constraints

- Keep the home map as the one expressive surface; content pages remain quiet and readable.
- Do not use Three.js.
- Use a multi-color isometric terrain inspired by voxel sandbox maps without copying Minecraft assets.
- No continuous full-screen flicker.
- No transition longer than 320 ms before navigation becomes usable.
- Respect keyboard navigation, touch input, and `prefers-reduced-motion`.
- Canvas is decorative to assistive technology; every destination remains a semantic link.
- Do not scale font size with viewport width and do not let motion resize controls or text containers.

---

### Task 1: Isometric Geometry and Deterministic World Model

**Files:**
- Create: `src/components/pixel/isometric.ts`
- Create: `scripts/check-isometric-map.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `projectTile(point, metrics): ScreenPoint`.
- Produces: `createWorld(seed, tabs, size): WorldTile[]`.
- Produces: `landmarkForTab(tab, index, size): Landmark`.
- `ScreenPoint`: `{ x: number, y: number }`.
- `WorldTile`: `{ x, y, elevation, terrain, colorIndex }`.

- [ ] **Step 1: Write a failing geometry contract script**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("src/components/pixel/isometric.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
assert.match(source, /export function projectTile/);
assert.match(source, /export function createWorld/);
assert.match(source, /screenX|originX/);
assert.doesNotMatch(source, /Math\.random\(/, "world generation must be deterministic");
assert.ok(js.length > 0);
```

Add `"test:map": "node scripts/check-isometric-map.mjs"` and run it.

Expected: FAIL because `isometric.ts` does not exist.

- [ ] **Step 2: Implement projection and seeded world generation**

```ts
export type IsoMetrics = { originX: number; originY: number; tileWidth: number; tileHeight: number; levelHeight: number };
export type WorldPoint = { x: number; y: number; elevation: number };

export function projectTile(point: WorldPoint, metrics: IsoMetrics) {
  const screenX = metrics.originX + (point.x - point.y) * metrics.tileWidth / 2;
  const screenY = metrics.originY + (point.x + point.y) * metrics.tileHeight / 2 - point.elevation * metrics.levelHeight;
  return { x: screenX, y: screenY };
}

function noise(seed: number, x: number, y: number) {
  const value = Math.sin(seed * 0.0001 + x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
```

Use `noise` to create grass, stone, and water terrain with elevations 0-3. Reserve deterministic landmark clearings derived from ordered visible tabs. Never call `Math.random`.

- [ ] **Step 3: Verify and commit**

Run: `npm run test:map`

Run: `npm run typecheck`

Expected: PASS.

```bash
git add package.json scripts/check-isometric-map.mjs src/components/pixel/isometric.ts
git commit -m "feat: define deterministic isometric world geometry"
```

### Task 2: Canvas Terrain and Landmark Renderer

**Files:**
- Create: `src/components/pixel/isometric-renderer.ts`
- Modify: `src/components/pixel/PixelMapCanvas.tsx`
- Modify: `scripts/check-isometric-map.mjs`

**Interfaces:**
- Consumes: Task 1 world and geometry.
- Produces: `drawWorld(context, world, options): RenderedLandmark[]`.
- Produces: `RenderedLandmark`: `{ id, x, y, width, height, color }` for HTML overlay positioning.

- [ ] **Step 1: Extend the failing contract**

Add assertions:

```js
const renderer = readFileSync("src/components/pixel/isometric-renderer.ts", "utf8");
assert.match(renderer, /export function drawWorld/);
assert.match(renderer, /drawImage|fillRect|beginPath/);
assert.match(renderer, /terrainLayer/);
assert.match(renderer, /devicePixelRatio/);
```

Run: `npm run test:map`

Expected: FAIL because the renderer is absent.

- [ ] **Step 2: Implement pixel tile drawing**

Draw each tile as one top diamond plus left and right faces when elevation is above its neighbor. Use solid palette values from existing tokens: green terrain, cyan water, amber paths, rose/violet landmarks, and neutral stone. Render landmarks as stacked cuboids with one distinct silhouette for `library`, `tower`, `workshop`, `house`, `portal`, and `page`.

Cache terrain in an offscreen canvas keyed by viewport bucket and tab configuration. Draw dynamic water highlights, path activation, landmark lift, and infrequent window light state on the visible canvas. Cap DPR at 2 and redraw at no more than 30 FPS.

- [ ] **Step 3: Replace the flat grid effect**

`PixelMapCanvas` must accept `{ tabs, activeId, pointer }`, use `ResizeObserver`, pause when the page is hidden, and render one static frame for reduced motion. Remove the old full-window pointer listener and attach pointer handling only to the map container.

```tsx
export type PixelMapCanvasProps = {
  tabs: TabConfig[];
  activeId: string | null;
  pointer: { x: number; y: number } | null;
  onLayout?: (landmarks: RenderedLandmark[]) => void;
};
```

- [ ] **Step 4: Verify and commit**

Run: `npm run test:map`

Run: `npm run typecheck`

Expected: PASS.

```bash
git add scripts/check-isometric-map.mjs src/components/pixel/PixelMapCanvas.tsx src/components/pixel/isometric-renderer.ts
git commit -m "feat: render voxel-style isometric map"
```

### Task 3: Accessible Landmark Interaction Layer

**Files:**
- Create: `src/components/pixel/IsometricMap.tsx`
- Modify: `src/components/pixel/MapNode.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: rendered landmark coordinates from Task 2 and `mapNodes` from normalized tab config.
- Produces: semantic map links with hover, focus, pointer, and touch state.

- [ ] **Step 1: Create the map coordinator component**

`IsometricMap` owns active landmark id, local pointer coordinates, landmark screen layout, and reduced-motion state. It renders canvas first and semantic links second. Each link gets CSS variables `--node-x`, `--node-y`, and `--node-color` from the renderer output.

```tsx
<MapNode
  {...tab.map}
  href={tab.href}
  label={tab.label}
  position={landmarkById.get(tab.id)}
  active={activeId === tab.id}
  onActiveChange={(active) => setActiveId(active ? tab.id : null)}
/>
```

- [ ] **Step 2: Make `MapNode` stable and accessible**

Use one link with `onPointerEnter`, `onPointerLeave`, `onFocus`, and `onBlur`; keep the beacon and bilingual label inside. Set a minimum 44 px target, `data-landmark`, and `data-transition-origin="map"`. The label may translate and change opacity but must keep reserved dimensions.

- [ ] **Step 3: Replace the home composition**

Keep `Pixel-Map` and `Personal Site` as the only hero copy. Put the isometric map full-bleed inside the first viewport, keep a hint of the latest-content band visible, and preserve the three content preview links below the map. Do not add new taglines or eyebrows.

- [ ] **Step 4: Implement responsive landmark layout**

Desktop landmarks overlay projected coordinates. Below 700 px, reduce world size and tile metrics but retain isometric geometry; use compact labels that open on focus/tap. Do not replace the map with cards.

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS.

```bash
git add src/app/page.tsx src/components/pixel/IsometricMap.tsx src/components/pixel/MapNode.tsx src/styles/globals.css
git commit -m "feat: add accessible isometric map landmarks"
```

### Task 4: Coordinated 2.5D Route Transitions

**Files:**
- Create: `src/components/motion/TransitionProvider.tsx`
- Modify: `src/components/motion/RouteFrame.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/styles/globals.css`
- Create: `scripts/check-route-transitions.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: transition phases `idle|leaving|entering`.
- Produces: `data-route-phase`, `data-route-origin`, and `data-route-theme` on the site shell.
- Intercepts only unmodified same-origin link clicks.

- [ ] **Step 1: Write a failing source contract**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const provider = readFileSync("src/components/motion/TransitionProvider.tsx", "utf8");
assert.match(provider, /event\.metaKey|event\.ctrlKey|event\.shiftKey|event\.altKey/);
assert.match(provider, /target\.origin !== window\.location\.origin/);
assert.match(provider, /prefers-reduced-motion/);
assert.match(provider, /router\.push/);
const css = readFileSync("src/styles/globals.css", "utf8");
assert.match(css, /data-route-phase="leaving"/);
assert.match(css, /data-route-phase="entering"/);
```

Add `"test:motion": "node scripts/check-route-transitions.mjs"`.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:motion`

Expected: FAIL because the provider is absent.

- [ ] **Step 3: Implement click interception and bounded phases**

Attach one capture-phase click listener to the provider root. Ignore non-left clicks, modified clicks, `_blank`, downloads, external URLs, and same-page hashes. For reduced motion call `router.push` immediately. Otherwise set `leaving`, wait 220 ms, push, and switch to `entering` when `usePathname` changes; return to `idle` after 300 ms. Clear timers on unmount and expose `aria-busy` only during the 220 ms exit.

- [ ] **Step 4: Implement one depth vocabulary**

Use perspective on a stable outer frame. Leaving pages translate 8 px downward, rotateX no more than 2 degrees, and fade behind a short pixel-layer overlay. Entering pages reverse the transform. Map-origin transitions use the active tab color; header navigation uses the destination tab color. Do not animate layout dimensions.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm run test:motion`

Run: `npm run typecheck`

Expected: PASS.

```bash
git add package.json scripts/check-route-transitions.mjs src/components/motion src/app/layout.tsx src/styles/globals.css
git commit -m "feat: coordinate 2.5d route transitions"
```

### Task 5: Scroll Motion, Reduced Motion, and Visual Acceptance

**Files:**
- Modify: `src/components/motion/MotionRuntime.tsx`
- Modify: `src/styles/globals.css`
- Modify: `scripts/check-markdown-codeblocks.mjs`
- Create: `scripts/check-visual-motion.mjs`
- Modify: `package.json`
- Create: `public/review-v2-home-desktop.png`
- Create: `public/review-v2-home-hover.png`
- Create: `public/review-v2-home-mobile.png`
- Create: `public/review-v2-admin-desktop.png`

**Interfaces:**
- Consumes: Tasks 1-4 visual states.
- Produces: final automated and screenshot evidence.

- [ ] **Step 1: Tighten reveal targets and CSS**

Keep `.prose` excluded. Reveal only repeated cards, timeline rows, list items, and explicit `[data-reveal]` panels. Use one 14 px vertical distance and one easing curve. Ensure the reduced-motion media query disables canvas animation triggers, route phases, parallax, beacons, and scroll reveals while leaving all content visible.

- [ ] **Step 2: Extend static motion assertions**

`check-visual-motion.mjs` must assert no `.prose` selector enters `querySelectorAll`, no animation exceeds 12 seconds except the intentionally infrequent landmark light cycle, route durations are at most 320 ms, and the mobile map is not hidden with `display: none`.

- [ ] **Step 3: Run full automated verification**

Run: `npm run test:markdown`

Run: `npm run test:map`

Run: `npm run test:motion`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all PASS.

- [ ] **Step 4: Perform browser acceptance and canvas pixel checks**

Start `npm run dev`, open the exact local URL, and verify desktop 1440x1000 plus mobile 390x844. Sample canvas pixels to confirm at least four palette families and a nonblank frame. Verify hover/focus raises one landmark without shifting labels, map navigation shows leaving and entering states, header navigation uses the same motion, and reduced motion navigates immediately.

- [ ] **Step 5: Capture review screenshots**

Save desktop home, active landmark, mobile home, and admin overview screenshots at the exact paths listed above. Confirm no text overlap, clipped controls, blank canvas, nested cards, or hidden content.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/check-markdown-codeblocks.mjs scripts/check-visual-motion.mjs src/components/motion/MotionRuntime.tsx src/styles/globals.css public/review-v2-*.png
git commit -m "test: verify pixel map motion and responsive layouts"
```

