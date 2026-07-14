import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
assert.equal(existsSync(join(root, "out/admin/index.html")), false, "public export must not contain admin");
assert.equal(existsSync(join(root, "admin/src/pages/PublishPage.tsx")), false, "local admin must not retain a Publish page");
const appSource = readFileSync(join(root, "admin/src/App.tsx"), "utf8");
const apiSource = readFileSync(join(root, "admin/server/api.mjs"), "utf8");
const gitSource = readFileSync(join(root, "admin/server/git.mjs"), "utf8");
const contentSource = readFileSync(join(root, "src/lib/content.ts"), "utf8");
assert.doesNotMatch(appSource, /PublishPage|\/publish/);
assert.doesNotMatch(apiSource, /validateSite|publishSelection|parts\[2\] === "validate"|parts\[2\] === "publish"/);
assert.doesNotMatch(gitSource, /runner\(\["(?:add|commit|push)"/);
assert.match(contentSource, /post\.published && !post\.deleted/);
assert.match(contentSource, /digest\.published && !digest\.deleted/);
assert.match(contentSource, /project\.published && !project\.deleted/);
assert.match(contentSource, /page\.published && !page\.deleted/);
const chunks = join(root, "out/_next/static/chunks");
assert.equal(existsSync(chunks), true, "Next export chunks are required for isolation verification");
for (const file of readdirSync(chunks, { recursive: true }).filter((name) => String(name).endsWith(".js"))) {
  const source = readFileSync(join(chunks, String(file)), "utf8");
  assert.doesNotMatch(source, /pixel-map-admin-settings|GitHubContentItem|Commit Tabs|PublishPage/);
}
