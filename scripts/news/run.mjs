import { existsSync } from "node:fs";
import { mkdir, readFile, rename as renameFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { selectFreshItems, shanghaiDate } from "./domain.mjs";
import { fetchSources as fetchConfiguredSources } from "./feed.mjs";
import { digestSlug, renderDigest } from "./digest.mjs";
import { summarizeItems as summarizeConfiguredItems } from "./openai.mjs";

async function readJsonAsync(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

function result(status, date, path, fetchedCount, selectedCount, failures, sourceHealth = []) {
  return { status, date, path, fetchedCount, selectedCount, failures, sourceHealth };
}

function stateWithUrls(state, items, now) {
  const urls = new Set((state.urls || []).map((url) => String(url)));
  for (const item of items) urls.add(item.url);

  return {
    ...state,
    lastPublishedDate: shanghaiDate(now),
    updatedAt: now.toISOString(),
    urls: [...urls].sort()
  };
}

export async function runDailyDigest(options = {}) {
  const root = options.root || join(process.cwd(), "src", "content");
  const configPath = join(root, "config", "news-sources.json");
  const statePath = join(root, "config", "news-seen.json");
  const config = options.config || await readJsonAsync(configPath, {});
  const state = options.state || await readJsonAsync(statePath, { urls: [] });
  const dependencies = options.dependencies || {};
  const now = dependencies.now || options.now || new Date();
  const date = shanghaiDate(now);
  const digestPath = join(root, "news", `${digestSlug(date)}.md`);
  const failures = [];

  if (!options.force && existsSync(digestPath)) {
    return result("already-published", date, digestPath, 0, 0, failures);
  }

  const fetchSources = dependencies.fetchSources || fetchConfiguredSources;
  const fetched = await fetchSources(config.sources || [], {
    fetchImpl: dependencies.fetchImpl || options.fetchImpl || fetch,
    now,
    attempts: config.fetchAttempts ?? 2,
    timeoutMs: config.fetchTimeoutMs ?? 10_000
  });
  failures.push(...(fetched.failures || []));

  if ((config.sources || []).length > 0 && failures.length === config.sources.length) {
    throw new Error("all configured news sources failed");
  }

  const selectItems = dependencies.selectFreshItems || selectFreshItems;
  const selected = selectItems(fetched.items || [], {
    now,
    maxAgeHours: config.maxAgeHours ?? 72,
    maxItems: config.maxItemsPerDigest ?? 8,
    seenUrls: new Set((state.urls || []).map((url) => String(url).toLowerCase())),
    topicKeywords: config.topicKeywords || [],
    maxPerSource: config.maxPerSource ?? 2,
    groupQuotas: config.groupQuotas || {}
  });

  if (selected.length === 0) {
    return result("no-fresh-items", date, digestPath, (fetched.items || []).length, 0, failures, fetched.sourceHealth || []);
  }

  const summarizeItems = dependencies.summarizeItems || summarizeConfiguredItems;
  const items = await summarizeItems(selected, {
    apiKey: options.apiKey || process.env.OPENAI_API_KEY,
    model: config.openAiModel,
    fetchImpl: dependencies.openAiFetchImpl || options.openAiFetchImpl || fetch
  });
  const digest = renderDigest({ date, items });
  const nextState = stateWithUrls(state, selected, now);
  const digestTempPath = `${digestPath}.tmp`;
  const stateTempPath = `${statePath}.tmp`;
  const rename = dependencies.rename || renameFile;

  try {
    await Promise.all([mkdir(join(root, "news"), { recursive: true }), mkdir(join(root, "config"), { recursive: true })]);
    await Promise.all([
      writeFile(digestTempPath, digest, "utf8"),
      writeFile(stateTempPath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8")
    ]);
    await rename(digestTempPath, digestPath);
    await rename(stateTempPath, statePath);
  } catch (error) {
    await Promise.all([rm(digestTempPath, { force: true }), rm(stateTempPath, { force: true })]);
    throw error;
  }

  return result("published", date, digestPath, (fetched.items || []).length, selected.length, failures, fetched.sourceHealth || []);
}
