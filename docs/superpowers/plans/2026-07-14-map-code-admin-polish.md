# Map, Code Rendering, and Admin Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the translucent interactive pixel identity, add Hexo-like static code highlighting, and make local content administration reversible and predictable.

**Architecture:** Keep one Canvas renderer for the background and isometric world, with DOM controls anchored above tab columns. Extend the synchronous Markdown fence renderer with `highlight.js`. Keep the local admin file-backed, replacing unlink with version-checked metadata updates and removing write-capable Git publishing.

**Tech Stack:** Next.js 14, React 18, Canvas 2D, Lucide React, markdown-it, highlight.js, Vite, Node.js test runner.

## Global Constraints

- The map background blinks rarely, never continuously.
- Resting tab controls show only an icon; hover, focus, or touch reveals the localized name.
- Public content must never return records with `deleted: true`.
- The local admin remains bound to `127.0.0.1` and is absent from static export.
- Keep migrated post images and existing Markdown extensions working.
- Do not add a Publish replacement.

---

### Task 1: Translucent Interactive Isometric Map

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `shared/site-config.mjs`
- Modify: `shared/site-config.d.ts`
- Modify: `src/content/config/tabs.json`
- Create: `src/components/pixel/TabIcon.tsx`
- Modify: `src/components/pixel/IsometricMap.tsx`
- Modify: `src/components/pixel/MapNode.tsx`
- Modify: `src/components/pixel/isometric-renderer.ts`
- Modify: `src/styles/globals.css`
- Modify: `admin/src/pages/TabsPage.tsx`
- Modify: `scripts/check-isometric-map.mjs`
- Modify: `scripts/check-visual-motion.mjs`

**Interfaces:**
- Consumes: `MapTab` and existing tab configuration.
- Produces: `TabIcon({ name })`, optional `map.icon`, translucent Canvas layers, icon-only resting controls.

- [ ] **Step 1: Add failing map contract assertions**

Require the renderer source to contain RGBA terrain and rare blink logic, require `MapNode` to render `TabIcon`, and reject a permanently visible description.

```js
assert.match(renderer, /rgba\(/);
assert.match(renderer, /rareBlink/);
assert.match(node, /<TabIcon/);
assert.doesNotMatch(node, /zhDescription/);
assert.match(css, /\.map-node:hover \.map-node__label/);
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:map`

Expected: FAIL because the current terrain uses opaque hex colors and the node renders title plus description at rest.

- [ ] **Step 3: Add dependencies and icon configuration**

Run: `npm install lucide-react@^0.468.0`

Add an allowed icon registry to the shared config and preserve old data with a fallback:

```js
const MAP_ICONS = ["home", "user", "book-open", "radio", "folder-kanban", "flask-conical", "map-pin"];
const icon = MAP_ICONS.includes(map.icon) ? map.icon : "map-pin";
```

Use a select in `TabsPage` rather than free text. Migrate built-in tabs to semantic icon names.

- [ ] **Step 4: Implement the fused Canvas layers**

Restore the old palette and pointer math inside `drawWorld`. Draw a sparse pixel field first, translucent terrain second, and columns last:

```ts
const rareBlink = Math.sin(options.time * 0.00072 + seed * 18) > 0.997;
context.fillStyle = `rgba(${rgb}, ${0.025 + hoverPulse * 0.16 + Number(rareBlink) * 0.18})`;
```

Terrain top and side faces use alpha variants of each palette color. Tab landmarks are tall cuboids with a brighter active top and no opaque black sides.

- [ ] **Step 5: Implement compact icon controls**

`MapNode` renders `TabIcon` and one localized label. CSS fixes the resting target at 42px square and expands it horizontally without moving the landmark anchor:

```css
.map-node__label { width: 0; opacity: 0; overflow: hidden; }
.map-node:hover .map-node__label,
.map-node:focus-visible .map-node__label,
.map-node[data-active="true"] .map-node__label { width: 9rem; opacity: 1; }
```

- [ ] **Step 6: Verify and commit**

Run: `npm run test:map`

Run: `npm run test:visual-motion`

Run: `npm run typecheck`

Expected: PASS.

```bash
git add package.json package-lock.json shared src/content/config/tabs.json src/components/pixel src/styles/globals.css admin/src/pages/TabsPage.tsx scripts/check-isometric-map.mjs scripts/check-visual-motion.mjs
git commit -m "feat: restore translucent pixel map interactions"
```

---

### Task 2: Hexo-Like Static Code Highlighting

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/lib/content.ts`
- Modify: `src/styles/globals.css`
- Modify: `scripts/check-markdown-codeblocks.mjs`

**Interfaces:**
- Consumes: markdown-it fence tokens and existing filename/language attributes.
- Produces: highlighted HTML with `.hljs-*` token spans and `.md-code-block__gutter` line numbers.

- [ ] **Step 1: Add failing syntax and gutter assertions**

Use a JavaScript fixture and an unknown-language injection fixture:

```js
assert.match(html, /class="hljs-keyword"/);
assert.match(html, /class="md-code-block__gutter"/);
assert.match(html, />1\n2</);
assert.doesNotMatch(unknownHtml, /<script>/);
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:markdown`

Expected: FAIL because code is currently escaped but not highlighted.

- [ ] **Step 3: Install and integrate highlight.js**

Run: `npm install highlight.js@^11.11.1`

Import `highlight.js/lib/common`. In the fence renderer, highlight only recognized languages and keep unknown code escaped:

```ts
const highlighted = language && hljs.getLanguage(language)
  ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value
  : escapeHtml(token.content);
```

Render a line-number `<pre aria-hidden="true">` beside the highlighted code while retaining filename and language captions.

- [ ] **Step 4: Add the static syntax theme**

Style `.hljs-comment`, `.hljs-keyword`, `.hljs-string`, `.hljs-number`, `.hljs-title`, `.hljs-attr`, `.hljs-addition`, and `.hljs-deletion`. Keep line numbers unselectable and code horizontally scrollable.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:markdown`

Run: `npm run typecheck`

Expected: PASS with legacy image and code metadata checks unchanged.

```bash
git add package.json package-lock.json src/lib/content.ts src/styles/globals.css scripts/check-markdown-codeblocks.mjs
git commit -m "feat: add Hexo-like code syntax highlighting"
```

---

### Task 3: Reversible Admin Content Maintenance

**Files:**
- Modify: `admin/server/content-store.mjs`
- Modify: `admin/server/content-store.test.mjs`
- Modify: `admin/server/api.mjs`
- Modify: `admin/server/git.mjs`
- Modify: `admin/server/git.test.mjs`
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/AdminShell.tsx`
- Modify: `admin/src/pages/OverviewPage.tsx`
- Modify: `admin/src/pages/ContentListPage.tsx`
- Modify: `admin/src/pages/ContentEditorPage.tsx`
- Delete: `admin/src/pages/PublishPage.tsx`
- Modify: `admin/src/admin.css`
- Modify: `src/lib/content.ts`
- Modify: `scripts/check-admin-isolation.mjs`

**Interfaces:**
- Produces: `softDelete(collection, slug, version)` and `restore(collection, slug, version)` returning `ContentRecord`.
- Removes: `/publish`, `/api/git/validate`, `/api/git/publish`, stage/commit/push operations.

- [ ] **Step 1: Write failing content-store tests**

```js
const removed = await store.softDelete("blog", "hello", loaded.version);
assert.equal(removed.metadata.deleted, true);
assert.equal(removed.metadata.published, false);
assert.equal(await readFile(file, "utf8").then(Boolean), true);

const restored = await store.restore("blog", "hello", removed.version);
assert.equal(restored.metadata.deleted, false);
assert.equal(restored.metadata.published, false);
```

Create dated fixtures and assert `2026-07-14` sorts before `2026-07-10`, regardless of slug.

- [ ] **Step 2: Verify RED**

Run: `npm run test:admin`

Expected: FAIL because the store unlinks content and sorts only by slug.

- [ ] **Step 3: Implement atomic soft delete, restore, and date sorting**

Reuse `withWriteLock`, version checks, `atomicReplace`, and `serializeFrontmatter`:

```js
const metadata = { ...current.metadata, deleted: true, published: false };
await atomicReplace(path, serializeFrontmatter(metadata, current.body));
```

Sort records by normalized metadata date descending and then slug descending.

- [ ] **Step 4: Update API and public readers**

`DELETE` returns the soft-deleted record with status 200. `POST /api/content/:collection/:slug/restore` restores it after version validation. Every public reader filters `deleted !== true` in addition to `published`.

- [ ] **Step 5: Remove Publish and make Git status read-only**

Delete the page and navigation route. Remove validation and publish API branches. Reduce `git.mjs` to `runGit` plus `status`; its test verifies only read commands and normalized changed paths.

- [ ] **Step 6: Update list/editor behavior and styles**

Sort the displayed records by date, add active/draft/deleted filters, show dates and status, change destructive copy to “移入回收状态”, and expose Restore for deleted records. Fix responsive editor columns, `min-width: 0`, control wrapping, row alignment, and focus visibility.

- [ ] **Step 7: Verify and commit**

Run: `npm run test:admin`

Run: `npm run test:admin-isolation`

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS; `out/admin` and Publish symbols are absent.

```bash
git add admin src/lib/content.ts scripts/check-admin-isolation.mjs
git commit -m "feat: simplify reversible content administration"
```

---

### Task 4: Final Visual Review

**Files:**
- Create: `public/review-translucent-map.png`

- [ ] **Step 1: Run focused verification**

Run: `npm run test:map`

Run: `npm run test:markdown`

Run: `npm run test:admin`

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Capture one desktop review image**

Open `http://127.0.0.1:3000`, hover one tab column, and capture the home viewport as `public/review-translucent-map.png`. Confirm the map is nonblank, the old low-frequency pixel field is visible, only one tab label is expanded, and the next section remains visible.

- [ ] **Step 3: Commit review artifact**

```bash
git add public/review-translucent-map.png
git commit -m "test: capture translucent map review state"
```
