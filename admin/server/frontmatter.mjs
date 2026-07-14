const KEY = /^[A-Za-z0-9_-]+$/;

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const source = trimmed.slice(1, -1).trim();
    if (!source) return [];
    return source.split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, ""));
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

export function parseFrontmatter(raw) {
  const match = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, body: String(raw).trim() };
  const metadata = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) metadata[pair[1]] = parseValue(pair[2]);
  }
  return { metadata, body: match[2].trim() };
}

export function assertMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("Invalid metadata");
  for (const [key, value] of Object.entries(metadata)) {
    if (!KEY.test(key)) throw new Error("Invalid metadata key");
    const valid = typeof value === "string" || typeof value === "boolean" || typeof value === "number" || (Array.isArray(value) && value.every((item) => typeof item === "string"));
    if (!valid) throw new Error(`Invalid metadata value for ${key}`);
  }
  return metadata;
}

function encodeValue(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  return String(value);
}

export function serializeFrontmatter(metadata, body = "") {
  assertMetadata(metadata);
  const lines = Object.entries(metadata).map(([key, value]) => `${key}: ${encodeValue(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${String(body).trim()}\n`;
}
