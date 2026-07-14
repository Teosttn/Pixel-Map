import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getCustomPageSlug, validateTabsConfig } from "../../shared/site-config.mjs";
import { assertSlug, resolveCollectionPath } from "./paths.mjs";

function versionFor(bytes, mtimeMs) { return createHash("sha256").update(bytes).update(String(mtimeMs)).digest("hex"); }
async function atomicWrite(path, content) { const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`; await writeFile(temporary, content, { mode: 0o600 }); await rename(temporary, path); }

export function createTabsStore(root) {
  const tabsPath = join(root, "src/content/config/tabs.json");
  async function readTabs() {
    const [bytes, info] = await Promise.all([readFile(tabsPath), stat(tabsPath)]);
    return { ...validateTabsConfig(JSON.parse(bytes.toString("utf8"))), version: versionFor(bytes, info.mtimeMs) };
  }
  async function writeTabs(value, version, { force = false } = {}) {
    const current = await readTabs();
    if (!force && current.version !== version) throw new Error("Tabs changed on disk; reload before saving");
    const validated = validateTabsConfig(value);
    await atomicWrite(tabsPath, `${JSON.stringify(validated, null, 2)}\n`);
    return readTabs();
  }
  async function createPageForTab(value, version, tab) {
    const validatedTab = validateTabsConfig({ tabs: [...value.tabs, tab] }).tabs.find((item) => item.id === tab.id);
    const slug = getCustomPageSlug(validatedTab);
    if (!slug) throw new Error("Only page tabs create Markdown pages");
    assertSlug(slug);
    const pagePath = resolveCollectionPath(root, "pages", slug);
    await mkdir(join(root, "src/content/pages"), { recursive: true });
    try { await writeFile(pagePath, `---\ntitle: ${JSON.stringify(validatedTab.label)}\ntitleZh: ${JSON.stringify(validatedTab.zh)}\ntitleEn: ${JSON.stringify(validatedTab.label)}\nsummary: \"\"\npublished: false\n---\n\n`, { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error?.code === "EEXIST") throw new Error("Custom page already exists"); throw error; }
    try { return await writeTabs({ tabs: [...value.tabs, tab] }, version); }
    catch (error) { await unlink(pagePath).catch(() => {}); throw error; }
  }
  return { readTabs, writeTabs, createPageForTab };
}
