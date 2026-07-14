import { resolve, sep } from "node:path";

export const COLLECTIONS = Object.freeze({
  blog: "src/content/blog",
  news: "src/content/news",
  projects: "src/content/projects",
  pages: "src/content/pages"
});

export function assertSlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    throw new Error("Invalid slug");
  }
  return slug;
}

export function resolveCollectionRoot(root, collection) {
  const relative = COLLECTIONS[collection];
  if (!relative) throw new Error("Invalid collection");
  const resolvedRoot = resolve(root, relative);
  const resolvedRepository = resolve(root);
  if (resolvedRoot !== resolvedRepository && !resolvedRoot.startsWith(`${resolvedRepository}${sep}`)) {
    throw new Error("Invalid collection root");
  }
  return resolvedRoot;
}

export function resolveCollectionPath(root, collection, slug) {
  const safeSlug = assertSlug(slug);
  const collectionRoot = resolveCollectionRoot(root, collection);
  const candidate = resolve(collectionRoot, `${safeSlug}.md`);
  if (!candidate.startsWith(`${collectionRoot}${sep}`)) throw new Error("Invalid content path");
  return candidate;
}
