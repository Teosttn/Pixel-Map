import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const provider = readFileSync("src/components/motion/TransitionProvider.tsx", "utf8");
assert.match(provider, /event\.metaKey|event\.ctrlKey|event\.shiftKey|event\.altKey/);
assert.match(provider, /target\.origin !== window\.location\.origin/);
assert.match(provider, /prefers-reduced-motion/);
assert.match(provider, /router\.push/);

const css = readFileSync("src/styles/globals.css", "utf8");
assert.match(css, /data-route-phase="leaving"/);
assert.match(css, /data-route-phase="entering"/);
