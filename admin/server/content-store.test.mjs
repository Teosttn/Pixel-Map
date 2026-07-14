import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createContentStore } from "./content-store.mjs";

test("rejects path traversal", async () => {
  const store = createContentStore(await mkdtemp(join(tmpdir(), "pixel-admin-")));
  await assert.rejects(() => store.read("blog", "../secret"), /Invalid slug/);
});

test("soft deletes and restores content without removing its Markdown file", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  const store = createContentStore(root);
  const created = await store.create("blog", "hello-world", { metadata: { title: "Hello", published: true, tags: ["test"] }, body: "Body" });
  assert.equal(created.metadata.title, "Hello");
  assert.equal((await store.list("blog")).length, 1);
  const removed = await store.softDelete("blog", "hello-world", created.version);
  assert.equal(removed.metadata.deleted, true);
  assert.equal(removed.metadata.published, false);
  assert.equal(await readFile(join(root, "src/content/blog/hello-world.md"), "utf8").then(Boolean), true);
  await assert.rejects(() => store.restore("blog", "hello-world", created.version), /changed on disk/);

  const restored = await store.restore("blog", "hello-world", removed.version);
  assert.equal(restored.metadata.deleted, false);
  assert.equal(restored.metadata.published, false);
});

test("lists content by date descending and then slug descending", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  const store = createContentStore(root);
  await store.create("blog", "older-z", { metadata: { date: "2026-07-10" }, body: "Older" });
  await store.create("blog", "newer-a", { metadata: { date: "2026-07-14" }, body: "Newer" });
  await store.create("blog", "newer-z", { metadata: { date: "2026-07-14" }, body: "Newest slug" });

  assert.deepEqual((await store.list("blog")).map((item) => item.slug), ["newer-z", "newer-a", "older-z"]);
});

test("detects optimistic write conflicts", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  await mkdir(join(root, "src/content/blog"), { recursive: true });
  await writeFile(join(root, "src/content/blog/hello.md"), "---\ntitle: \"Hello\"\n---\n\nBody\n");
  const store = createContentStore(root);
  const loaded = await store.read("blog", "hello");
  await writeFile(join(root, "src/content/blog/hello.md"), "---\ntitle: \"Changed\"\n---\n\nBody\n");
  await assert.rejects(() => store.update("blog", "hello", { ...loaded, body: "Edited" }), /changed on disk/);
});
