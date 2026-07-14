import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createContentStore } from "./content-store.mjs";

test("rejects path traversal", async () => {
  const store = createContentStore(await mkdtemp(join(tmpdir(), "pixel-admin-")));
  await assert.rejects(() => store.read("blog", "../secret"), /Invalid slug/);
});

test("creates, reads, and deletes content only within collections", async () => {
  const root = await mkdtemp(join(tmpdir(), "pixel-admin-"));
  const store = createContentStore(root);
  const created = await store.create("blog", "hello-world", { metadata: { title: "Hello", published: true, tags: ["test"] }, body: "Body" });
  assert.equal(created.metadata.title, "Hello");
  assert.equal((await store.list("blog")).length, 1);
  await store.delete("blog", "hello-world", created.version);
  assert.equal((await store.list("blog")).length, 0);
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
