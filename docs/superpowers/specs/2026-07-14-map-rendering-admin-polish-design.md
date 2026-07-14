# Pixel-Map Visual and Admin Polish Design

## Goal

Restore the original low-frequency pixel interaction, reshape the isometric map into the same translucent visual language, add Hexo-like syntax highlighting, and simplify the local admin around reliable content maintenance.

## Home Map

The home hero uses one Canvas renderer with three coordinated layers:

1. A dark transparent pixel field restores the former multi-color rare blink behavior and pointer proximity response.
2. Semi-transparent isometric terrain uses the same palette and low alpha instead of opaque Minecraft-style blocks. Terrain remains readable through top faces, restrained side faces, and sparse light pulses.
3. Each visible tab is represented by a tall colored translucent column. The DOM interaction target is anchored to the column top.

Tab controls show only a semantic Lucide icon at rest. Hover, keyboard focus, or touch activation expands the control to reveal the localized tab name. Descriptions are removed from the map surface. Custom tabs select an icon from a small supported registry and fall back to `MapPin`.

Animation remains low frequency. The background does not continuously flash. Pointer movement briefly increases nearby tile opacity and column lift. `prefers-reduced-motion` disables blinking and animated expansion while preserving navigation.

## Markdown Code Rendering

Keep the existing `markdown-it` engine because it already supports migrated images, containers, marks, attributes, headings, and legacy asset rewriting. Add `highlight.js` to the fence renderer instead of replacing the content pipeline.

Known languages receive static syntax spans at build time. The code figure keeps filename and language metadata and gains a Hexo-like line-number gutter. Unknown languages remain safely escaped. Theme rules cover comments, keywords, strings, numbers, function names, properties, additions, and deletions without depending on client JavaScript.

## Local Admin

Remove the Publish route, navigation item, page, validation actions, and commit/push API. The overview may retain read-only Git branch and dirty-file status, but the admin can no longer stage, commit, or push.

Content deletion becomes reversible soft deletion:

- `DELETE /api/content/:collection/:slug` atomically writes `deleted: true` and `published: false` after version validation.
- Deleted files remain in the repository and appear in the admin with a deleted state.
- The editor offers Restore, which clears `deleted` while leaving `published: false` until the user explicitly republishes.
- Public content readers always exclude `deleted: true`, even if malformed metadata also says `published: true`.

Content lists sort by frontmatter date descending, then slug descending. Filters distinguish active, draft, and deleted records. Styling fixes focus on stable control widths, responsive editor columns, readable status rows, overflow handling, focus states, and consistent destructive-action placement.

## Verification

- Renderer checks cover translucent colors, rare blinking, icon-only resting state, and reduced motion.
- Markdown tests require highlighted token classes, line numbers, escaped unknown-language code, and retained legacy image behavior.
- Admin tests cover date sorting, soft deletion, restoration, optimistic version conflicts, and absence of Publish routes.
- Run typecheck, focused tests, and one production build.
- Use one desktop browser screenshot to review the final home composition; no extended cross-device QA is required in this iteration.
