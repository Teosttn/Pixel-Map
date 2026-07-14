import assert from "node:assert/strict";
import test from "node:test";
import { validateTabsConfig } from "./site-config.mjs";

const map = { glyph: "A", landmark: "archive", x: 10, y: 20, color: "var(--pixel-green)", title: "Archive", zhTitle: "档案", description: "Notes", zhDescription: "笔记" };

test("rejects duplicate ids and hrefs", () => {
  assert.throws(() => validateTabsConfig({ tabs: [
    { id: "a", kind: "built-in", label: "A", zh: "甲", href: "/a", visible: true, order: 0, map },
    { id: "a", kind: "built-in", label: "B", zh: "乙", href: "/a", visible: true, order: 1, map }
  ] }), /duplicate/);
});

test("rejects custom pages that collide with reserved routes", () => {
  assert.throws(() => validateTabsConfig({ tabs: [
    { id: "admin", kind: "page", label: "Admin", zh: "后台", href: "/admin", visible: true, order: 0, map }
  ] }), /reserved/);
});
