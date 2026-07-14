import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("src/components/pixel/isometric.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

assert.match(source, /export function projectTile/);
assert.match(source, /export function createWorld/);
assert.match(source, /screenX|originX/);
assert.doesNotMatch(source, /Math\.random\(/, "world generation must be deterministic");
assert.ok(js.length > 0);

const renderer = readFileSync("src/components/pixel/isometric-renderer.ts", "utf8");
assert.match(renderer, /export function drawWorld/);
assert.match(renderer, /drawImage|fillRect|beginPath/);
assert.match(renderer, /devicePixelRatio/);
assert.doesNotMatch(renderer, /document\.createElement\("canvas"\)/, "the map must fuse all visual layers into one canvas renderer");
assert.match(renderer, /rgba\(/, "terrain and landmarks must preserve the dark canvas beneath them");
assert.match(renderer, /rareBlink/, "the sparse background field must retain rare blinking");

const node = readFileSync("src/components/pixel/MapNode.tsx", "utf8");
const css = readFileSync("src/styles/globals.css", "utf8");
assert.match(node, /<TabIcon/, "map controls must render the controlled Lucide icon");
assert.doesNotMatch(node, /zhDescription/, "map controls must not expose descriptions");
assert.match(css, /\.map-node:hover \.map-node__label/, "hover must reveal the compact localized label");
assert.match(css, /\.map-node__label\s*\{[\s\S]*?width:\s*0/, "labels must be collapsed at rest");
assert.match(css, /\.map-node:hover,[\s\S]*?\.map-node\[data-active="true"\][\s\S]*?z-index:\s*20/, "active landmarks must rise above sibling nodes");
assert.match(css, /\.map-node__beacon\s*\{[\s\S]*?position:\s*relative[\s\S]*?z-index:\s*1/, "the icon must have an explicit local layer");
assert.match(css, /\.map-node__label\s*\{[\s\S]*?z-index:\s*2/, "the expanded title must render above its icon layer");
