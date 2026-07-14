import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/app/[slug]/page.tsx", import.meta.url), "utf8");
assert.match(source, /generateStaticParams/);
assert.match(source, /kind === "page"/);
assert.match(source, /getCustomPage/);
assert.match(source, /markdownToHtml/);
assert.match(source, /__pixel-map-unconfigured/);
