# Admin Publishing and News Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only, auditable content publishing page and replace the low-quality single-source news selection and fake bilingual fallback with diversified AI news collection and strict translation.

**Architecture:** The Admin server owns a narrowly scoped Git publishing service that may stage only `src/content`, `src/content/config/tabs.json`, and `public/uploads`, requires the current branch to be `main`, checks remote divergence, validates the site, commits, and pushes through the existing SSH remote. The news pipeline remains a dependency-free Node/GitHub Actions job, but collectors return source metadata, selection enforces region/category diversity, and OpenAI output is language-validated with one repair attempt and no fake bilingual fallback.

**Tech Stack:** Node.js 20, React 18, Vite, Next.js 14, Git CLI over SSH, GitHub Actions, Node test runner, OpenAI Responses API.

## Global Constraints

- The Admin remains loopback-only and all mutating publish routes require the local session guard.
- Publishing never stores a GitHub token and never stages files outside the explicit managed-path allowlist.
- Publishing is blocked unless the current branch is `main`, the remote main branch is reachable, and the local branch is not behind it.
- Every digest item retains its original source URL.
- Chinese fields must contain Chinese text; English fields must contain English text and must not duplicate Chinese fields.
- A failed translation repair aborts generation instead of emitting fake bilingual content.
- Existing user changes in `src/content/blog/hello-pixel-map.md` and `src/content/config/tabs.json` must be preserved.

---

### Task 1: Safe Git Publishing Service

**Files:**
- Modify: `admin/server/git.mjs`
- Modify: `admin/server/git.test.mjs`

**Interfaces:**
- Produces: `createGitService(root, runner, commandRunner)` with `status()`, `publishStatus()`, and `publish({ message })`.
- Produces: publish status fields `branch`, `remote`, `targetBranch`, `publishableFiles`, `blockedFiles`, `canPublish`, and `blockers`.

- [ ] **Step 1: Write failing tests** for managed-path classification, feature-branch blocking, remote-behind blocking, command order, and refusal to stage blocked paths.
- [ ] **Step 2: Run `node --test admin/server/git.test.mjs`** and verify the new assertions fail because publish APIs do not exist.
- [ ] **Step 3: Implement the minimal publishing service** using argument-array Git commands: `fetch origin main`, `rev-list --left-right --count HEAD...origin/main`, validation command, `git add -- <allowlisted files>`, `git commit`, and `git push origin HEAD:main`.
- [ ] **Step 4: Run `node --test admin/server/git.test.mjs`** and verify all tests pass.

### Task 2: Publish API and Admin Page

**Files:**
- Modify: `admin/server/api.mjs`
- Modify: `admin/src/api/client.ts`
- Create: `admin/src/pages/PublishPage.tsx`
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/AdminShell.tsx`
- Modify: `admin/src/admin.css`
- Modify: `scripts/check-admin-editor.mjs`

**Interfaces:**
- Consumes: `git.publishStatus()` and `git.publish({ message })` from Task 1.
- Produces: `GET /api/git/publish-status` and session-protected `POST /api/git/publish`.

- [ ] **Step 1: Extend the Admin structure check** to require a `/publish` route, navigation item, explicit commit-message input, confirmation control, and publish action.
- [ ] **Step 2: Run `node scripts/check-admin-editor.mjs`** and verify it fails on the missing page.
- [ ] **Step 3: Implement the API route and focused Publish page** with a staged pipeline display, managed/blocked file lists, disabled reasons, explicit confirmation, and success/error feedback.
- [ ] **Step 4: Run `npm run test:admin`** and verify the Admin tests pass.

### Task 3: Diversified News Selection

**Files:**
- Modify: `scripts/news/feed.mjs`
- Modify: `scripts/news/feed.test.mjs`
- Modify: `scripts/news/domain.mjs`
- Modify: `scripts/news/domain.test.mjs`
- Modify: `src/content/config/news-sources.json`

**Interfaces:**
- Produces: feed items carrying `region`, `category`, and source metadata.
- Produces: `selectFreshItems(items, options)` honoring `maxPerSource` and `groupQuotas` while retaining ranking and URL deduplication.

- [ ] **Step 1: Write failing tests** proving feed metadata survives parsing and selection cannot be dominated by one source when alternatives are available.
- [ ] **Step 2: Run `node --test scripts/news/feed.test.mjs scripts/news/domain.test.mjs`** and verify failures show missing metadata and diversity selection.
- [ ] **Step 3: Implement metadata propagation and deterministic quota-aware selection** without adding dependencies.
- [ ] **Step 4: Replace the source configuration** with balanced domestic, international, research, and open-source sources; cap every source at two items and keep Vercel as a low-weight frontend source only.
- [ ] **Step 5: Run the focused tests** and verify they pass.

### Task 4: Strict Real Translation

**Files:**
- Modify: `scripts/news/openai.mjs`
- Create: `scripts/news/openai.test.mjs`

**Interfaces:**
- Produces: `validateSummaryOutput(value, expectedLength)` with language and duplicate checks.
- Produces: `summarizeItems()` that retries once with a repair prompt and throws after a second invalid response.

- [ ] **Step 1: Write failing tests** for English copied into Chinese fields, Chinese copied into English fields, identical bilingual fields, successful repair, and failed repair.
- [ ] **Step 2: Run `node --test scripts/news/openai.test.mjs`** and verify the language-quality cases fail.
- [ ] **Step 3: Remove the fake fallback and implement strict prompts, language validation, and one repair request.**
- [ ] **Step 4: Run `node --test scripts/news/openai.test.mjs`** and verify all cases pass.

### Task 5: Pipeline Integration and Verification

**Files:**
- Modify: `scripts/news/run.mjs`
- Modify: `scripts/news/run.test.mjs`
- Modify: `.github/workflows/daily-news.yml`
- Modify: `scripts/check-workflows.mjs`

**Interfaces:**
- Consumes: quota configuration and strict summarization from Tasks 3 and 4.
- Produces: daily workflow diagnostics with fetched, selected, and failed-source counts.

- [ ] **Step 1: Write failing integration assertions** proving group quotas reach selection and source failures are reported in the workflow summary.
- [ ] **Step 2: Run `npm run test:news && npm run test:workflows`** and verify the new assertions fail.
- [ ] **Step 3: Pass diversity options through `runDailyDigest`, remove fallback CLI behavior, and append source health to `$GITHUB_STEP_SUMMARY`.**
- [ ] **Step 4: Run `npm run test:news`, `npm run test:workflows`, `npm run test:admin`, `npm run typecheck`, and `npm run build`.**
- [ ] **Step 5: Start the Admin server and capture `/publish` at desktop and mobile widths** to verify layout, disabled states, keyboard focus, and no overlap.

