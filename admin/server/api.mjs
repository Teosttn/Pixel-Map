import { createContentStore } from "./content-store.mjs";
import { createGitService } from "./git.mjs";
import { createMediaStore } from "./media.mjs";
import { createTabsStore } from "./tabs.mjs";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body exceeds 1 MB");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new Error("Invalid JSON body"); }
}

async function readUpload(req) {
  const match = String(req.headers["content-type"] || "").match(/multipart\/form-data;\s*boundary=(.+)$/i);
  if (!match) throw new Error("Expected multipart image upload");
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 11 * 1024 * 1024) throw new Error("Image upload must be 10 MB or smaller"); chunks.push(chunk); }
  const source = Buffer.concat(chunks); const boundary = Buffer.from(`--${match[1]}`); const start = source.indexOf(boundary); const end = source.indexOf(boundary, start + boundary.length);
  const part = source.subarray(start + boundary.length + 2, end - 2); const separator = part.indexOf(Buffer.from("\r\n\r\n")); const headers = part.subarray(0, separator).toString("utf8"); const bytes = part.subarray(separator + 4);
  const filename = headers.match(/filename="([^"]+)"/i)?.[1]; const mime = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
  if (!filename || !mime) throw new Error("Upload requires one image file");
  return { filename, mime, bytes };
}

function apiError(error) {
  if (error?.code === "ENOENT") return [404, "Content was not found"];
  if (/changed on disk|being updated|仅允许从 main|远端 main|范围之外|没有可发布|未配置 origin/.test(error?.message || "")) return [409, error.message];
  if (/Invalid|already exists|exceeds|JSON|Only image|Image upload|Expected multipart|Upload requires|提交说明/.test(error?.message || "")) return [400, error.message];
  return [500, "Local admin request failed"];
}

export function createApiHandler({ root, sessionGuard }) {
  const store = createContentStore(root);
  const tabs = createTabsStore(root);
  const media = createMediaStore(root);
  const git = createGitService(root);
  return async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "api") return false;
    if (parts[1] === "health" && req.method === "GET") { send(res, 200, { ok: true, localOnly: true }); return true; }
    if (parts[1] === "overview" && req.method === "GET") {
      try {
        const [blog, news, projects, pages, status] = await Promise.all([store.list("blog"), store.list("news"), store.list("projects"), store.list("pages"), git.status()]);
        const latestDigest = news.map((item) => String(item.metadata.date || item.slug)).sort().at(-1);
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
        send(res, 200, { counts: { blog: blog.length, news: news.length, projects: projects.length, pages: pages.length }, latestDigest, todayDigest: latestDigest === today, ...status });
      } catch (error) { const [status, message] = apiError(error); send(res, status, { error: message }); }
      return true;
    }
    if (parts[1] === "media") {
      if (["POST", "DELETE"].includes(req.method || "GET") && !sessionGuard(req, res)) return true;
      try {
        if (req.method === "GET") send(res, 200, { items: await media.list() });
        else if (req.method === "POST") send(res, 201, await media.upload(await readUpload(req)));
        else if (req.method === "DELETE" && parts[2]) { await media.remove(parts[2]); send(res, 204, {}); }
        else send(res, 405, { error: "Unsupported media operation" });
      } catch (error) { const [status, message] = apiError(error); send(res, status, { error: message }); }
      return true;
    }
    if (parts[1] === "git") {
      if (parts[2] === "publish" && req.method === "POST" && !sessionGuard(req, res)) return true;
      try {
        if (parts[2] === "status" && req.method === "GET") send(res, 200, await git.status());
        else if (parts[2] === "publish-status" && req.method === "GET") send(res, 200, await git.publishStatus());
        else if (parts[2] === "publish" && req.method === "POST") { const body = await readJson(req); send(res, 200, await git.publish(body)); }
        else send(res, 405, { error: "Unsupported git operation" });
      } catch (error) { const [status, message] = apiError(error); send(res, status, { error: message }); }
      return true;
    }
    if (parts[1] === "tabs") {
      if (["POST", "PUT", "DELETE"].includes(req.method || "GET") && !sessionGuard(req, res)) return true;
      try {
        if (req.method === "GET") send(res, 200, await tabs.readTabs());
        else if (req.method === "PUT") { const body = await readJson(req); send(res, 200, await tabs.writeTabs(body, body.version, { force: body.force })); }
        else if (req.method === "POST" && parts[2] === "page") { const body = await readJson(req); send(res, 201, await tabs.createPageForTab(body, body.version, body.tab)); }
        else send(res, 405, { error: "Unsupported tabs operation" });
      } catch (error) {
        const [status, message] = apiError(error);
        send(res, status, { error: message });
      }
      return true;
    }
    if (parts[1] !== "content") return false;
    if (["POST", "PUT", "DELETE"].includes(req.method || "GET") && !sessionGuard(req, res)) return true;
    try {
      const collection = parts[2] || url.searchParams.get("collection");
      const slug = parts[3];
      if (req.method === "GET" && !slug) send(res, 200, { items: await store.list(collection) });
      else if (req.method === "GET") send(res, 200, await store.read(collection, slug));
      else if (req.method === "POST" && slug && parts[4] === "restore") { const body = await readJson(req); send(res, 200, await store.restore(collection, slug, body.version)); }
      else if (req.method === "POST" && collection) { const body = await readJson(req); send(res, 201, await store.create(collection, body.slug, body)); }
      else if (req.method === "PUT" && slug) { const body = await readJson(req); send(res, 200, await store.update(collection, slug, body)); }
      else if (req.method === "DELETE" && slug) { const body = await readJson(req); send(res, 200, await store.softDelete(collection, slug, body.version)); }
      else send(res, 405, { error: "Unsupported content operation" });
    } catch (error) {
      const [status, message] = apiError(error);
      send(res, status, { error: message });
    }
    return true;
  };
}
