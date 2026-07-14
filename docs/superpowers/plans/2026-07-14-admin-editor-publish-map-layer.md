# Admin Editor Publishing and Map Hover Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous Admin publish checkbox with direct draft/publish actions and guarantee hovered map titles render above sibling landmarks.

**Architecture:** Keep the existing local content API and optimistic versioning. Model the editor intent in `ContentEditorPage` so each save request writes an explicit lifecycle state, then use a small source-level regression script to lock the UI contract. Fix map overlap through CSS stacking only and extend the existing map contract check.

**Tech Stack:** React 18, TypeScript, Vite 5 local middleware, Node assertion scripts, Next.js 14 CSS.

## Global Constraints

- Publishing content does not run Git commands and does not push to GitHub.
- The admin remains loopback-only.
- Existing Markdown and media paths are preserved.
- The current uncommitted article state must not be reverted or staged.

---

### Task 1: Explicit Admin Draft and Publish Actions

**Files:**
- Create: `scripts/check-admin-editor.mjs`
- Modify: `admin/src/pages/ContentEditorPage.tsx`
- Modify: `admin/src/admin.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `api<ContentRecord>()`, `request()`, and `ContentRecord.metadata`.
- Produces: `save(intent: "draft" | "publish", force?: boolean)` where draft writes `{ deleted: false, published: false }` and publish writes `{ deleted: false, published: true }`.

- [ ] **Step 1: Write the failing Admin UI contract check**

Create `scripts/check-admin-editor.mjs` that reads the editor and CSS sources and asserts:

```js
assert.doesNotMatch(editor, /type="checkbox"[\s\S]*?>发布/);
assert.match(editor, /save\("draft"\)/);
assert.match(editor, /save\("publish"\)/);
assert.match(editor, /deleted:\s*false/);
assert.match(editor, /published:\s*intent === "publish"/);
assert.match(editor, /StatusBanner tone="success"/);
assert.match(editor, /<details className="advanced-metadata">/);
assert.match(css, /\.editor-actions\s*\{[\s\S]*?position:\s*sticky/);
```

Add it to `test:admin` after the server tests:

```json
"test:admin": "node --test admin/server/*.test.mjs && node scripts/check-admin-editor.mjs"
```

- [ ] **Step 2: Run the Admin tests and verify the new check fails**

Run: `npm run test:admin`

Expected: server tests pass, then `check-admin-editor.mjs` fails because the checkbox and old save API still exist.

- [ ] **Step 3: Implement explicit lifecycle actions**

In `ContentEditorPage.tsx`:

```ts
type SaveIntent = "draft" | "publish";

const save = async (intent: SaveIntent, force = false) => {
  const metadata = {
    ...parsed,
    ...record.metadata,
    title,
    date: String(record.metadata.date || ""),
    summary: String(record.metadata.summary || ""),
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    deleted: false,
    published: intent === "publish"
  };
  // POST or PUT through the existing API, replace record with response,
  // and show "草稿已保存" or "内容已发布".
};
```

Render a sticky `.editor-actions` bar above `.editor-layout` with a lifecycle badge, reload, conditional conflict overwrite, soft-delete icon, `保存草稿`/`转为草稿`, and `发布`/`更新发布`. Remove the publish checkbox and the old bottom actions. Put the raw JSON field inside `<details className="advanced-metadata">` and show successful operations through `<StatusBanner tone="success">`.

On a `changed on disk` error, remember the attempted intent and expose `强制覆盖`; do not show it during the normal workflow. Saving either intent clears `deleted`, so a soft-deleted record is restored atomically with its edited contents.

- [ ] **Step 4: Add the focused Admin styles**

Add stable lifecycle and action styles:

```css
.editor-actions { position: sticky; top: 0; z-index: 8; display: flex; align-items: center; gap: 8px; margin-bottom: 18px; border-block: 1px solid #bdc9cc; padding: 10px 0; background: #e7ecee; }
.editor-actions__status { margin-right: auto; }
.advanced-metadata summary { cursor: pointer; color: #55646a; font-size: 12px; font-weight: 700; }
.advanced-metadata[open] summary { margin-bottom: 8px; }
```

Keep the action bar wrapping at narrow widths and do not introduce a second editor card.

- [ ] **Step 5: Run focused verification**

Run: `npm run test:admin && npm run typecheck`

Expected: 10 server tests pass, the Admin UI contract script exits 0, and TypeScript exits 0.

- [ ] **Step 6: Commit Task 1 without staging content Markdown**

```bash
git add scripts/check-admin-editor.mjs admin/src/pages/ContentEditorPage.tsx admin/src/admin.css package.json
git commit -m "fix: make admin publishing explicit"
```

### Task 2: Raise Active Map Titles Above Landmarks

**Files:**
- Modify: `scripts/check-isometric-map.mjs`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: existing `.map-node` hover, focus, and `data-active="true"` states.
- Produces: a sibling stacking contract where the active node has `z-index: 20`, the beacon has local `z-index: 1`, and the title has local `z-index: 2`.

- [ ] **Step 1: Extend the map contract check and verify RED**

Append assertions requiring explicit stacking:

```js
assert.match(css, /\.map-node:hover,[\s\S]*?\.map-node\[data-active="true"\][\s\S]*?z-index:\s*20/);
assert.match(css, /\.map-node__beacon\s*\{[\s\S]*?position:\s*relative[\s\S]*?z-index:\s*1/);
assert.match(css, /\.map-node__label\s*\{[\s\S]*?z-index:\s*2/);
```

Run: `npm run test:map`

Expected: FAIL because current hover only adds a filter.

- [ ] **Step 2: Implement local and sibling stacking**

Update the existing selectors:

```css
.map-node__beacon { position: relative; z-index: 1; }
.map-node__label { z-index: 2; }
.map-node:hover,
.map-node:focus-visible,
.map-node[data-active="true"] { z-index: 20; }
```

- [ ] **Step 3: Run focused verification**

Run: `npm run test:map && npm run test:visual-motion && npm run typecheck`

Expected: every command exits 0.

- [ ] **Step 4: Commit Task 2 without staging content Markdown**

```bash
git add scripts/check-isometric-map.mjs src/styles/globals.css
git commit -m "fix: raise active map labels"
```

### Task 3: Browser Verification

**Files:**
- No production files unless the browser check exposes a regression.

**Interfaces:**
- Consumes: local site at `http://127.0.0.1:3000` and Admin at `http://127.0.0.1:4317`.
- Produces: visual evidence that actions remain visible, deleted content can be published directly, and a focused map title is above neighboring nodes.

- [ ] **Step 1: Restart local servers after tests**

Run `npm run dev -- --hostname 127.0.0.1 --port 3000` and `npm run admin -- --host 127.0.0.1 --port 4317` in separate sessions.

- [ ] **Step 2: Verify without mutating the user's article**

Open the current deleted article and confirm the sticky actions show `保存草稿` and `发布`; do not click either action during visual verification. Capture the editor and homepage hover/focus states.

- [ ] **Step 3: Final status check**

Run: `git status --short --branch`

Expected: only the user's pre-existing `src/content/blog/hello-pixel-map.md` modification remains unstaged.
