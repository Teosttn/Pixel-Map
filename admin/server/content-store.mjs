import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { COLLECTIONS, resolveCollectionPath, resolveCollectionRoot } from "./paths.mjs";

function versionFor(bytes, modifiedAt) {
  return createHash("sha256").update(bytes).update(String(modifiedAt)).digest("hex");
}

async function readRecord(root, collection, slug) {
  const path = resolveCollectionPath(root, collection, slug);
  const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
  const { metadata, body } = parseFrontmatter(bytes.toString("utf8"));
  return { collection, slug, path: relative(root, path), metadata, body, version: versionFor(bytes, info.mtimeMs) };
}

async function withWriteLock(path, work) {
  const lockPath = `${path}.pixel-admin.lock`;
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("Content is being updated by another local admin request");
    throw error;
  }
  try {
    return await work();
  } finally {
    await lock?.close();
    await unlink(lockPath).catch(() => {});
  }
}

async function atomicReplace(path, content) {
  const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, content, { mode: 0o600 });
  await rename(temporary, path);
}

export function createContentStore(root) {
  return {
    async list(collection) {
      const directory = resolveCollectionRoot(root, collection);
      const files = await readdir(directory, { withFileTypes: true }).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
      const records = await Promise.all(files.filter((file) => file.isFile() && file.name.endsWith(".md")).map((file) => readRecord(root, collection, file.name.slice(0, -3))));
      return records.sort((left, right) => right.slug.localeCompare(left.slug));
    },
    read(collection, slug) {
      return readRecord(root, collection, slug);
    },
    async create(collection, slug, { metadata = {}, body = "" }) {
      const path = resolveCollectionPath(root, collection, slug);
      await mkdir(resolveCollectionRoot(root, collection), { recursive: true });
      const content = serializeFrontmatter(metadata, body);
      let file;
      try {
        file = await open(path, "wx", 0o600);
        await file.writeFile(content);
      } catch (error) {
        if (error?.code === "EEXIST") throw new Error("Content already exists");
        throw error;
      } finally {
        await file?.close();
      }
      return readRecord(root, collection, slug);
    },
    async update(collection, slug, { metadata = {}, body = "", version, force = false }) {
      const path = resolveCollectionPath(root, collection, slug);
      return withWriteLock(path, async () => {
        const current = await readRecord(root, collection, slug);
        if (!force && current.version !== version) throw new Error("Content changed on disk; reload before saving");
        await atomicReplace(path, serializeFrontmatter(metadata, body));
        return readRecord(root, collection, slug);
      });
    },
    async delete(collection, slug, version) {
      const path = resolveCollectionPath(root, collection, slug);
      return withWriteLock(path, async () => {
        const current = await readRecord(root, collection, slug);
        if (current.version !== version) throw new Error("Content changed on disk; reload before deleting");
        await unlink(path);
      });
    },
    collections: COLLECTIONS
  };
}
