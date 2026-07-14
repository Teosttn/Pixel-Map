import { createHash } from "node:crypto";
import { mkdir, open, readdir, readFile, stat, unlink } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg" });

export function sanitizeMediaName(name, hash) {
  const source = basename(String(name || "upload"));
  const rawBase = source.slice(0, Math.max(0, source.length - extname(source).length)) || "image";
  const base = rawBase.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "image";
  const extension = extname(source).slice(1).toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return `${base.slice(0, 72)}-${hash.slice(0, 6)}.${extension}`;
}

function assertMediaPath(root, name) {
  if (typeof name !== "string" || name !== basename(name) || !/^[a-z0-9][a-z0-9-]*-[a-f0-9]{6}\.[a-z0-9]+$/i.test(name)) throw new Error("Invalid media name");
  const directory = resolve(root, "public/uploads");
  const path = resolve(directory, name);
  if (!path.startsWith(`${directory}${sep}`)) throw new Error("Invalid media path");
  return { directory, path };
}

function readDimensions(bytes, mime) {
  if (mime === "image/png" && bytes.readUInt32BE(12) === 0x49484452) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (mime === "image/gif") return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (mime === "image/jpeg") {
    for (let index = 2; index < bytes.length - 9; index += 1) if (bytes[index] === 0xff && bytes[index + 1] >= 0xc0 && bytes[index + 1] <= 0xc3) return { width: bytes.readUInt16BE(index + 7), height: bytes.readUInt16BE(index + 5) };
  }
  if (mime === "image/svg+xml") { const viewBox = bytes.toString("utf8", 0, Math.min(bytes.length, 4096)).match(/viewBox=["'][^"']*\s(\d+(?:\.\d+)?)\s(\d+(?:\.\d+)?)["']/i); return viewBox ? { width: Number(viewBox[1]), height: Number(viewBox[2]) } : undefined; }
  return undefined;
}

async function findReferences(root, name) {
  const contentRoot = resolve(root, "src/content");
  const references = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return visit(path);
      if (entry.isFile() && entry.name.endsWith(".md") && (await readFile(path, "utf8")).includes(`/uploads/${name}`)) references.push(path.slice(root.length + 1));
    }));
  }
  await visit(contentRoot);
  return references.sort();
}

export function createMediaStore(root) {
  return {
    async list() {
      const directory = resolve(root, "public/uploads");
      const entries = await readdir(directory, { withFileTypes: true }).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
      return Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
        const path = join(directory, entry.name); const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
        const extension = extname(entry.name).slice(1).toLowerCase(); const mime = Object.entries(MIME_EXTENSIONS).find(([, value]) => value === extension)?.[0] || "application/octet-stream";
        return { name: entry.name, path: `/uploads/${entry.name}`, bytes: info.size, dimensions: readDimensions(bytes, mime), references: await findReferences(root, entry.name) };
      }));
    },
    async upload({ filename, mime, bytes }) {
      if (!MIME_EXTENSIONS[mime]) throw new Error("Only image uploads are allowed");
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES) throw new Error("Image upload must be between 1 byte and 10 MB");
      const hash = createHash("sha256").update(bytes).digest("hex");
      const name = sanitizeMediaName(`${filename.replace(/\.[^.]+$/, "")}.${MIME_EXTENSIONS[mime]}`, hash);
      const { directory, path } = assertMediaPath(root, name);
      await mkdir(directory, { recursive: true });
      let target;
      try { target = await open(path, "wx", 0o600); await target.writeFile(bytes); }
      catch (error) { if (error?.code === "EEXIST") return { name, path: `/uploads/${name}`, bytes: bytes.length, dimensions: readDimensions(bytes, mime) }; throw error; }
      finally { await target?.close(); }
      return { name, path: `/uploads/${name}`, bytes: bytes.length, dimensions: readDimensions(bytes, mime) };
    },
    async remove(name) { const { path } = assertMediaPath(root, name); await unlink(path); }
  };
}
