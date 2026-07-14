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
assert.match(renderer, /terrainLayer/);
assert.match(renderer, /devicePixelRatio/);
