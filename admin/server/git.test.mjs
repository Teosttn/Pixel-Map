import assert from "node:assert/strict";
import test from "node:test";
import { createGitService } from "./git.mjs";

test("reports normalized Git status using read-only commands", async () => {
  const calls = [];
  const service = createGitService("/repo", async (args) => {
    calls.push(args);
    if (args[0] === "branch") return { stdout: "codex/pixel-map-v2\n", stderr: "" };
    if (args[0] === "config") return { stdout: "git@example.com:pixel-map.git\n", stderr: "" };
    return { stdout: " M src/content/blog/hello.md\u0000?? public/uploads/image.png\u0000R  src/content/news/new.md\u0000src/content/news/old.md\u0000", stderr: "" };
  });

  assert.deepEqual(await service.status(), {
    branch: "codex/pixel-map-v2",
    remote: "git@example.com:pixel-map.git",
    changedFiles: ["src/content/blog/hello.md", "public/uploads/image.png", "src/content/news/new.md"]
  });
  assert.deepEqual(calls, [
    ["branch", "--show-current"],
    ["config", "--get", "remote.origin.url"],
    ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]
  ]);
});
