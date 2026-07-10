# Local Administration Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public GitHub-token editor with a mature local-only administration application that manages tabs, content, media, validation, commit, and push.

**Architecture:** Run a separate Vite React application on `127.0.0.1` with focused same-origin middleware APIs. The server reads and writes only allowlisted repository paths, while the public Next.js build consumes the resulting Markdown and JSON without importing any admin code.

**Tech Stack:** React 18, TypeScript, Vite 5, Node.js 20 ESM, built-in `node:test`, Markdown-it, local Git/SSH, Next.js static export.

## Global Constraints

- Keep GitHub Pages as the only production host.
- Do not expose any administration route or administration bundle in the production export.
- Bind the admin server only to `127.0.0.1`.
- Do not store GitHub tokens or OpenAI keys in browser storage or tracked files.
- Keep logical pages and server modules separate; do not put all administration features in one page.
- Invoke Git with fixed argument arrays and never interpolate user input into a shell command.
- Preserve bilingual navigation, Markdown code blocks, legacy posts, and images.

---

### Task 1: Scaffold the Local-Only Admin Runtime and Security Boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `admin/index.html`
- Create: `admin/vite.config.mjs`
- Create: `admin/server/security.mjs`
- Create: `admin/server/security.test.mjs`
- Create: `admin/src/main.tsx`
- Create: `admin/src/App.tsx`
- Create: `admin/src/admin.css`

**Interfaces:**
- Produces: `npm run admin` bound to `127.0.0.1`.
- Produces: `createSessionGuard({ secret, allowedOrigins }): (req, res) => boolean`.
- Produces: `/api/health` returning `{ ok: true, localOnly: true }`.

- [ ] **Step 1: Install the bounded admin toolchain**

Run: `npm install --save-dev vite@^5.4.21 @vitejs/plugin-react@^4.3.4`

Expected: `package.json` and lockfile update without changing React or Next versions.

- [ ] **Step 2: Write failing loopback and Origin tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedHost, isAllowedOrigin } from "./security.mjs";

test("allows only localhost host headers", () => {
  assert.equal(isAllowedHost("127.0.0.1:4317"), true);
  assert.equal(isAllowedHost("localhost:4317"), true);
  assert.equal(isAllowedHost("pixel-map.example.com"), false);
});

test("allows only same local origins", () => {
  assert.equal(isAllowedOrigin("http://127.0.0.1:4317", "127.0.0.1:4317"), true);
  assert.equal(isAllowedOrigin("https://attacker.example", "127.0.0.1:4317"), false);
});
```

- [ ] **Step 3: Run and verify RED**

Run: `node --test admin/server/security.test.mjs`

Expected: FAIL because `security.mjs` does not exist.

- [ ] **Step 4: Implement the guard and Vite middleware**

```js
export function isAllowedHost(host = "") {
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host);
}

export function isAllowedOrigin(origin, host) {
  if (!origin) return true;
  try {
    const value = new URL(origin);
    return value.protocol === "http:" && value.host === host && /^(127\.0\.0\.1|localhost)$/i.test(value.hostname);
  } catch {
    return false;
  }
}
```

`vite.config.mjs` must set `root` to `admin`, `server.host` to `127.0.0.1`, `server.port` to `4317`, and install a middleware plugin that rejects invalid Host/Origin before routing `/api/health`. Use a random per-process secret in an HttpOnly `SameSite=Strict` cookie for mutation routes.

- [ ] **Step 5: Add scripts and verify GREEN**

Add:

```json
"admin": "vite --config admin/vite.config.mjs",
"test:admin": "node --test admin/server/*.test.mjs"
```

Run: `npm run test:admin`

Run: `npm run admin`

Expected: tests PASS and Vite reports `http://127.0.0.1:4317/`. Stop the manual server after the smoke check.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json admin
git commit -m "feat: scaffold loopback-only admin runtime"
```

### Task 2: Safe Content Repository and Optimistic File Writes

**Files:**
- Create: `admin/server/paths.mjs`
- Create: `admin/server/frontmatter.mjs`
- Create: `admin/server/content-store.mjs`
- Create: `admin/server/content-store.test.mjs`
- Create: `admin/server/api.mjs`

**Interfaces:**
- Produces: `COLLECTIONS = { blog, news, projects, pages }`.
- Produces: `resolveCollectionPath(root, collection, slug): string`.
- Produces: `listContent`, `readContent`, `createContent`, `updateContent`, `deleteContent`.
- A read result includes `{ collection, slug, path, metadata, body, version }`.

- [ ] **Step 1: Write failing traversal, CRUD, and conflict tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createContentStore } from "./content-store.mjs";

test("rejects path traversal", async () => {
  const store = createContentStore(await mkdtemp(join(tmpdir(), "pixel-admin-")));
  await assert.rejects(() => store.read("blog", "../secret"), /Invalid slug/);
});

test("detects optimistic write conflicts", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  await mkdir(join(root, "src/content/blog"), { recursive: true });
  await writeFile(join(root, "src/content/blog/hello.md"), `---\ntitle: "Hello"\n---\n\nBody\n`);
  const store = createContentStore(root);
  const loaded = await store.read("blog", "hello");
  await writeFile(join(root, "src/content/blog/hello.md"), `---\ntitle: "Changed"\n---\n\nBody\n`);
  await assert.rejects(() => store.update("blog", "hello", { ...loaded, body: "Edited" }), /changed on disk/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test admin/server/content-store.test.mjs`

Expected: FAIL because the store is absent.

- [ ] **Step 3: Implement path containment and frontmatter parsing**

Use an explicit collection map:

```js
export const COLLECTIONS = Object.freeze({
  blog: "src/content/blog",
  news: "src/content/news",
  projects: "src/content/projects",
  pages: "src/content/pages"
});

export function assertSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) throw new Error("Invalid slug");
}
```

Resolve the candidate with `resolve`, verify it starts with `${collectionRoot}${sep}`, and append `.md` internally. Serialize only flat strings, booleans, numbers, and string arrays supported by the public parser. Compute `version` as SHA-256 of file bytes plus `mtimeMs`.

- [ ] **Step 4: Implement API handlers**

Add focused handlers for list, get, create, update, and delete. Parse JSON with a 1 MB limit, return `409` for optimistic conflicts, `404` for missing records, and `400` for validation errors. Require the session guard for POST, PUT, and DELETE.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm run test:admin`

Expected: PASS.

```bash
git add admin/server
git commit -m "feat: add safe local content repository"
```

### Task 3: Normalize Tab Configuration and Add Markdown-Backed Pages

**Files:**
- Create: `shared/site-config.mjs`
- Create: `shared/site-config.d.ts`
- Create: `shared/site-config.test.mjs`
- Modify: `src/content/config/tabs.json`
- Modify: `src/lib/site.ts`
- Create: `src/app/[slug]/page.tsx`
- Create: `scripts/check-custom-pages.mjs`
- Create: `admin/server/tabs.mjs`
- Create: `admin/server/tabs.test.mjs`

**Interfaces:**
- Produces: `validateTabsConfig(value): { tabs: TabConfig[] }` shared by Next and admin.
- `TabConfig`: `{ id, kind, label, zh, href, visible, order, map }`.
- Produces: `siteConfig.tabs`, `siteConfig.nav`, and `mapNodes` derived from one array.

- [ ] **Step 1: Write failing schema and reserved-route tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateTabsConfig } from "./site-config.mjs";

test("rejects duplicate ids and hrefs", () => {
  assert.throws(() => validateTabsConfig({ tabs: [
    { id: "a", kind: "built-in", label: "A", zh: "甲", href: "/a", visible: true, order: 0, map: {} },
    { id: "a", kind: "built-in", label: "B", zh: "乙", href: "/a", visible: true, order: 1, map: {} }
  ] }), /duplicate/);
});

test("rejects custom pages that collide with reserved routes", () => {
  assert.throws(() => validateTabsConfig({ tabs: [
    { id: "admin", kind: "page", label: "Admin", zh: "后台", href: "/admin", visible: true, order: 0, map: {} }
  ] }), /reserved/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test shared/site-config.test.mjs`

Expected: FAIL because the shared validator is absent.

- [ ] **Step 3: Implement the shared schema and migrate `tabs.json`**

Define required map fields as `glyph`, `landmark`, `x`, `y`, `color`, `title`, `zhTitle`, `description`, and `zhDescription`. Validate `kind` as `built-in|page|external`, HTTPS for external links, `/slug` for internal links, unique id/href/order, and reserved custom slugs. Convert the current five tabs without changing their user-facing labels.

- [ ] **Step 4: Add public custom-page generation and its source contract**

The root dynamic route generates only visible `page` tabs, reads `src/content/pages/<slug>.md`, calls `notFound` for absent pages, and renders through `markdownToHtml`. Static built-in routes continue to win over `[slug]`. Do not add a placeholder production tab. Instead, create `scripts/check-custom-pages.mjs` that asserts the route exports `generateStaticParams`, filters `kind === "page"`, reads the pages collection, and renders with `markdownToHtml`.

- [ ] **Step 5: Add local tab operations**

Implement `readTabs`, `writeTabs`, and `createPageForTab`. A page tab creation writes both validated config and a default page file only after both target paths are checked; rollback the page file if the config write fails. Removing a tab does not remove content.

- [ ] **Step 6: Verify and commit**

Run: `node --test shared/site-config.test.mjs admin/server/tabs.test.mjs`

Run: `node scripts/check-custom-pages.mjs`

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS with no extra production tab added.

```bash
git add shared scripts/check-custom-pages.mjs src/content/config/tabs.json src/lib/site.ts 'src/app/[slug]/page.tsx' admin/server
git commit -m "feat: manage tabs from one validated schema"
```

### Task 4: Modular Admin Client for Overview, Tabs, and Content

**Files:**
- Create: `admin/src/api/client.ts`
- Create: `admin/src/components/AdminShell.tsx`
- Create: `admin/src/components/StatusBanner.tsx`
- Create: `admin/src/components/ConfirmDialog.tsx`
- Create: `admin/src/components/MarkdownEditor.tsx`
- Create: `admin/src/pages/OverviewPage.tsx`
- Create: `admin/src/pages/TabsPage.tsx`
- Create: `admin/src/pages/ContentListPage.tsx`
- Create: `admin/src/pages/ContentEditorPage.tsx`
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/admin.css`

**Interfaces:**
- Consumes: Tasks 1-3 APIs.
- Produces: separate URL-addressable admin sections using `history.pushState` and a small pathname router.

- [ ] **Step 1: Define the typed API client**

```ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed with ${response.status}`);
  return body as T;
}
```

- [ ] **Step 2: Build the shell and pathname router**

`AdminShell` owns only navigation and a main outlet. `App` maps `/`, `/tabs`, `/content`, and `/content/:collection/:slug` to page components, listens to `popstate`, and intercepts only same-origin admin navigation. Unknown paths render a not-found state with a link to Overview.

- [ ] **Step 3: Implement Overview and Tabs pages**

Overview loads counts, digest freshness, branch, remote, and changed-file summaries. Tabs renders a compact ordered table with icon buttons for move up/down, visibility toggle, edit, and remove; a separate form handles add/edit. Validate before submission and preserve unsaved inputs on server errors.

- [ ] **Step 4: Implement content list and editor**

Content list uses a collection segmented control, search input, publication filter, and explicit create action. Editor renders metadata controls beside a Markdown body editor with preview. Save sends the loaded `version`; `409` shows reload and overwrite actions. Delete and duplicate require confirmation.

- [ ] **Step 5: Add restrained admin styling and compile verification**

Use a dense two-column work layout, 4-8 px radii, stable control sizes, visible focus, no nested cards, and no ambient animation. Keep all text inside controls at 320 px viewport width.

Run: `npm run admin -- --host 127.0.0.1`

Run: `npm run typecheck`

Expected: Vite compiles all routes and Next type checking remains green.

- [ ] **Step 6: Commit**

```bash
git add admin/src
git commit -m "feat: add modular local content administration"
```

### Task 5: Media, Validation, and Git/SSH Publishing

**Files:**
- Create: `admin/server/media.mjs`
- Create: `admin/server/media.test.mjs`
- Create: `admin/server/git.mjs`
- Create: `admin/server/git.test.mjs`
- Create: `admin/src/pages/MediaPage.tsx`
- Create: `admin/src/pages/PublishPage.tsx`
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/AdminShell.tsx`
- Modify: `admin/src/admin.css`

**Interfaces:**
- Produces: media list/upload/delete APIs under `public/uploads`.
- Produces: `gitStatus`, `validateSite`, and `publishSelection({ paths, message })`.
- Git runner signature: `runGit(args: string[], { cwd }): Promise<{ stdout, stderr }>`.

- [ ] **Step 1: Write failing media containment and Git argument tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMediaName } from "./media.mjs";
import { createGitService } from "./git.mjs";

test("sanitizes uploaded media names", () => {
  assert.equal(sanitizeMediaName("../../My Image.png", "abc123"), "my-image-abc123.png");
});

test("stages only explicit repository paths", async () => {
  const calls = [];
  const service = createGitService("/repo", async (args) => { calls.push(args); return { stdout: "", stderr: "" }; });
  await service.stage(["src/content/blog/post.md", "public/uploads/image.png"]);
  assert.deepEqual(calls, [["add", "--", "src/content/blog/post.md", "public/uploads/image.png"]]);
  await assert.rejects(() => service.stage(["../secret"]), /Invalid publish path/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test admin/server/media.test.mjs admin/server/git.test.mjs`

Expected: FAIL because modules are absent.

- [ ] **Step 3: Implement media services**

Accept only image MIME types, cap uploads at 10 MB, derive a lowercase sanitized base name plus a six-character content hash, and write with exclusive creation. List relative path, bytes, and dimensions when readable. Delete only allowlisted upload files and reject legacy asset deletion.

- [ ] **Step 4: Implement validation and publish services**

Use `spawn` with `shell: false`. `validateSite` runs, in order, `npm run test:news`, `npm run test:content`, `npm run test:workflows`, `npm run test:admin`, `npm run typecheck`, and `npm run build`; stop at the first failure and return captured output. `publishSelection` validates paths, stages with `git add --`, commits with `git commit -m <message> -- <paths...>`, and pushes the current branch with `git push origin <branch>`.

- [ ] **Step 5: Implement Media and Publish pages**

Media uses an upload button, thumbnail grid, path-copy action, and confirmed delete. Publish shows changed files with checkboxes, validation progress, commit message, and a disabled Publish button until validation succeeds. Never preselect unrelated changed files.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm run test:admin`

Expected: PASS.

```bash
git add admin/server admin/src
git commit -m "feat: publish local content through git ssh"
```

### Task 6: Remove Public Admin and Verify Isolation

**Files:**
- Delete: `src/app/admin/page.tsx`
- Delete: `src/components/admin/AdminConsole.tsx`
- Modify: `src/styles/globals.css`
- Modify: `.github/workflows/nextjs.yml`
- Modify: `scripts/check-workflows.mjs`
- Create: `scripts/check-admin-isolation.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: production build contract with no `/admin` route or admin bundle.

- [ ] **Step 1: Write the isolation assertion before deleting the route**

```js
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

assert.equal(existsSync(join(process.cwd(), "out/admin/index.html")), false, "public export must not contain admin");
const files = readdirSync(join(process.cwd(), "out/_next/static/chunks"), { recursive: true });
for (const file of files.filter((name) => String(name).endsWith(".js"))) {
  const source = readFileSync(join(process.cwd(), "out/_next/static/chunks", String(file)), "utf8");
  assert.doesNotMatch(source, /pixel-map-admin-settings|GitHubContentItem|Commit Tabs/);
}
```

Add `"test:admin-isolation": "node scripts/check-admin-isolation.mjs"`.

- [ ] **Step 2: Build and verify RED**

Run: `npm run build`

Run: `npm run test:admin-isolation`

Expected: FAIL because the current public admin route is exported.

- [ ] **Step 3: Remove the public route and styles**

Delete the two public admin files and remove `.admin-*` CSS rules from the public stylesheet. Update CI and workflow contract tests to assert `test ! -f out/admin/index.html`.

- [ ] **Step 4: Run complete admin verification**

Run: `npm run test:admin`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm run test:admin-isolation`

Expected: all PASS.

- [ ] **Step 5: Browser acceptance**

Start `npm run admin`, open `http://127.0.0.1:4317/`, verify Overview, Tabs, Content, Media, and Publish at desktop and 390 px mobile widths. Confirm a non-local Host request returns 403. Keep the server available for the final user review, then stop it before completion.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/check-admin-isolation.mjs scripts/check-workflows.mjs .github/workflows/nextjs.yml src/styles/globals.css
git rm src/app/admin/page.tsx src/components/admin/AdminConsole.tsx
git commit -m "refactor: isolate administration from public site"
```
