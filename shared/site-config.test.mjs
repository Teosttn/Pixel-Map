import assert from "node:assert/strict";
import test from "node:test";
import * as siteConfig from "./site-config.mjs";

const { validateTabsConfig } = siteConfig;

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

test("removes the configured base path before client-side routing", () => {
  assert.equal(typeof siteConfig.withoutBasePath, "function");
  assert.equal(siteConfig.withoutBasePath("/Pixel-Map/blog", "/Pixel-Map"), "/blog");
  assert.equal(siteConfig.withoutBasePath("/Pixel-Map", "/Pixel-Map"), "/");
  assert.equal(siteConfig.withoutBasePath("/Pixel-Mapper/blog", "/Pixel-Map"), "/Pixel-Mapper/blog");
  assert.equal(siteConfig.withoutBasePath("/blog", ""), "/blog");
});
