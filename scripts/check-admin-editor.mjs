import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync("admin/src/pages/ContentEditorPage.tsx", "utf8");
const css = readFileSync("admin/src/admin.css", "utf8");

assert.doesNotMatch(editor, /type="checkbox"[\s\S]*?>发布/);
assert.match(editor, /save\("draft"\)/);
assert.match(editor, /save\("publish"\)/);
assert.match(editor, /deleted:\s*false/);
assert.match(editor, /published:\s*intent === "publish"/);
assert.match(editor, /StatusBanner tone="success"/);
assert.match(editor, /<details className="advanced-metadata">/);
assert.match(css, /\.editor-actions\s*\{[\s\S]*?position:\s*sticky/);
