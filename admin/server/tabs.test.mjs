import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createTabsStore } from "./tabs.mjs";

const tab = { id: "field-notes", kind: "page", label: "Field notes", zh: "田野笔记", href: "/field-notes", visible: true, order: 0, map: { glyph: "F", landmark: "archive", x: 20, y: 20, color: "var(--pixel-green)", title: "Field notes", zhTitle: "田野笔记", description: "Notes", zhDescription: "笔记" } };

test("creates Markdown pages only after validated tab setup", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  await mkdir(join(root, "src/content/config"), { recursive: true });
  await writeFile(join(root, "src/content/config/tabs.json"), "{\"tabs\": []}\n");
  const store = createTabsStore(root);
  const loaded = await store.readTabs();
  const result = await store.createPageForTab(loaded, loaded.version, tab);
  assert.equal(result.tabs[0].id, "field-notes");
});
