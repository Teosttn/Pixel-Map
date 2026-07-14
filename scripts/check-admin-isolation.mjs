import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
assert.equal(existsSync(join(root, "out/admin/index.html")), false, "public export must not contain admin");
const chunks = join(root, "out/_next/static/chunks");
assert.equal(existsSync(chunks), true, "Next export chunks are required for isolation verification");
for (const file of readdirSync(chunks, { recursive: true }).filter((name) => String(name).endsWith(".js"))) {
  const source = readFileSync(join(chunks, String(file)), "utf8");
  assert.doesNotMatch(source, /pixel-map-admin-settings|GitHubContentItem|Commit Tabs/);
}
