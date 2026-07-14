# Admin Editor Publishing and Map Hover Layer

## Goal

Make local content editing direct and recoverable while keeping deployment separate from content state. Ensure an expanded map label is always rendered above neighboring landmarks.

## Root Cause

- The current article is soft deleted (`deleted: true`, `published: false`). The editor disables its publish checkbox and hides restore among bottom actions.
- Publishing is modeled as a checkbox followed by a separate save. The editor provides no success feedback and its primary actions sit below a tall Markdown field.
- Map landmarks share the same stacking level. Expanding one landmark changes its width but does not raise its stacking order.

## Content State Actions

The editor exposes state as a status badge and two explicit primary actions near the top:

- **Save draft** saves all current fields with `deleted: false` and `published: false`.
- **Publish** saves all current fields with `deleted: false` and `published: true`.

Both actions create new content or update existing content in one request. Therefore either action also restores a soft-deleted record without losing the edits currently in the form. Soft delete remains a separate destructive action and always writes `deleted: true`, `published: false`.

The old publish checkbox is removed. Advanced metadata is collapsed by default. Successful actions show a status banner with the resulting state. Reload remains available as a secondary action; force overwrite is only useful after a version conflict and is not a normal primary action.

## Map Layering

The active, hovered, or keyboard-focused `.map-node` receives the highest landmark `z-index`. Its beacon and expanded label have explicit local stacking levels. The title remains clipped only by the homepage boundary, not by sibling landmarks.

## Boundaries

- Publishing content does not run Git commands and does not push to GitHub.
- The admin remains loopback-only.
- Existing Markdown and media paths are preserved.
- The current uncommitted article state is not reverted or overwritten during implementation.

## Verification

- Add a focused regression test for draft/publish metadata transitions, including soft-deleted records.
- Extend the map contract check to require active-node stacking.
- Run admin tests, map tests, typecheck, and one browser check of the editor and homepage hover state.
