# Task 2: Hexo-Like Static Code Highlighting

## Scope

- Baseline: `650750e`
- Worktree: `/Users/bytedance/Documents/Pixel-Map/.worktrees/codex-pixel-map-v2`
- No map renderer or admin content logic changed.

## Implementation

- Added `highlight.js@^11.11.1` and imported `highlight.js/lib/common` in the existing `markdown-it` fence renderer.
- Known languages are highlighted synchronously at build time; unknown languages use the existing HTML escaping path.
- Code figures retain filename and language captions, add an aria-hidden line-number gutter, and keep the code pane horizontally scrollable.
- Added restrained multi-color syntax rules for comments, keywords, strings, numbers, titles, attributes, additions, and deletions.
- Kept the existing Markdown plugins, legacy asset transformation, attrs, containers, marks, emoji, and image behavior in the same rendering pipeline.

## Test Evidence

- RED: `npm run test:markdown` failed before implementation because `hljs-keyword` spans were absent.
- PASS: `npm run test:markdown` after implementation and after a fresh static build.
- PASS: `npm run typecheck`.
- PASS: `npm run build` generated all 58 static pages successfully.

## Attention Points

- `highlight.js/lib/common` intentionally highlights only registered languages. New language aliases need explicit support before they receive token spans.
- Unknown fence languages remain escaped instead of using automatic detection, preserving deterministic output and the injection boundary.
