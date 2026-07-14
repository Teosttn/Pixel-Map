const INTERNAL_HREF = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(["admin", "api", "_next", "about", "blog", "lab", "news", "projects", "rss", "rss.xml", "sitemap", "sitemap.xml", "tags", "__pixel-map-unconfigured"]);
const KINDS = new Set(["built-in", "page", "external"]);
export const MAP_ICONS = ["home", "user", "book-open", "radio", "folder-kanban", "flask-conical", "map-pin"];
const MAP_FIELDS = ["glyph", "landmark", "x", "y", "color", "title", "zhTitle", "description", "zhDescription"];

function assertText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${field}`);
  return value.trim();
}

function validateMap(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("Invalid map configuration");
  for (const field of MAP_FIELDS) {
    if (!(field in map)) throw new Error(`Missing map.${field}`);
  }
  for (const field of ["glyph", "landmark", "color", "title", "zhTitle", "description", "zhDescription"]) assertText(map[field], `map.${field}`);
  for (const field of ["x", "y"]) {
    if (typeof map[field] !== "number" || map[field] < 0 || map[field] > 100) throw new Error(`Invalid map.${field}`);
  }
  const icon = MAP_ICONS.includes(map.icon) ? map.icon : "map-pin";
  return { ...map, icon };
}

function validateTab(tab) {
  if (!tab || typeof tab !== "object" || Array.isArray(tab)) throw new Error("Invalid tab");
  const id = assertText(tab.id, "tab id").toLowerCase();
  if (!ID.test(id)) throw new Error("Invalid tab id");
  if (!KINDS.has(tab.kind)) throw new Error("Invalid tab kind");
  const label = assertText(tab.label, "tab label");
  const zh = assertText(tab.zh, "tab zh");
  if (typeof tab.visible !== "boolean") throw new Error("Invalid tab visibility");
  if (!Number.isInteger(tab.order) || tab.order < 0) throw new Error("Invalid tab order");
  const href = assertText(tab.href, "tab href");
  if (tab.kind === "external") {
    try { if (new URL(href).protocol !== "https:") throw new Error("External tabs require HTTPS"); }
    catch { throw new Error("External tabs require HTTPS"); }
  } else if (!INTERNAL_HREF.test(href)) {
    throw new Error("Internal tabs require a single-segment path");
  }
  if (tab.kind === "page" && (RESERVED_SLUGS.has(href.slice(1)) || href.slice(1) !== id)) throw new Error("Custom page uses a reserved or mismatched route");
  return { id, kind: tab.kind, label, zh, href, visible: tab.visible, order: tab.order, map: validateMap(tab.map) };
}

export function validateTabsConfig(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.tabs)) throw new Error("Tabs config requires a tabs array");
  const ids = new Set();
  const hrefs = new Set();
  const orders = new Set();
  const tabs = value.tabs.map(validateTab);
  for (const tab of tabs) {
    if (ids.has(tab.id) || hrefs.has(tab.href) || orders.has(tab.order)) throw new Error("Tabs config contains duplicate id, href, or order");
    ids.add(tab.id); hrefs.add(tab.href); orders.add(tab.order);
  }
  return { tabs: tabs.sort((left, right) => left.order - right.order) };
}

export function getCustomPageSlug(tab) {
  if (tab.kind !== "page") return null;
  return tab.href.slice(1);
}
