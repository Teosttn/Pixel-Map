import { appendFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runDailyDigest } from "./news/run.mjs";

export function parseArguments(argumentsList) {
  const options = { force: false };

  for (const argument of argumentsList) {
    if (argument === "--force") options.force = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function outputPath(path) {
  return path ? relative(process.cwd(), path) : "";
}

export async function writeGithubOutput(summary, output = process.env.GITHUB_OUTPUT) {
  if (!output) return;
  await appendFile(output, `changed=${summary.changed}\ndigest_path=${summary.digestPath}\n`, "utf8");
}

export async function writeGithubStepSummary(summary, output = process.env.GITHUB_STEP_SUMMARY) {
  if (!output) return;
  const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const failures = summary.failures?.length
    ? summary.failures.map((failure) => `- ${cell(failure.source)}: ${cell(failure.message)}`).join("\n")
    : "- None";
  const sourceRows = (summary.sourceHealth || []).map((source) => `| ${cell(source.source)} | ${cell(source.status)} | ${source.itemCount} |`).join("\n") || "| No source data | unknown | 0 |";
  const markdown = [
    `## Daily News ${summary.date}`,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Status | ${summary.status} |`,
    `| Fetched | ${summary.fetchedCount} |`,
    `| Selected | ${summary.selectedCount} |`,
    "",
    "### Source failures",
    failures,
    "",
    "### Source health",
    "| Source | Status | Items |",
    "| --- | --- | ---: |",
    sourceRows,
    ""
  ].join("\n");
  await appendFile(output, markdown, "utf8");
}

export async function main(argumentsList = process.argv.slice(2)) {
  const options = parseArguments(argumentsList);
  const digest = await runDailyDigest(options);
  const changed = digest.status === "published";
  const summary = {
    status: digest.status,
    date: digest.date,
    digestPath: outputPath(digest.path),
    changed,
    fetchedCount: digest.fetchedCount,
    selectedCount: digest.selectedCount,
    failures: digest.failures,
    sourceHealth: digest.sourceHealth
  };

  console.log(JSON.stringify(summary));
  await Promise.all([writeGithubOutput(summary), writeGithubStepSummary(summary)]);

  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
