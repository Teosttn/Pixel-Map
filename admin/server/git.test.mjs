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

test("publish status separates managed content from blocked repository changes", async () => {
  const service = createGitService("/repo", async (args) => {
    if (args[0] === "branch") return { stdout: "main\n", stderr: "" };
    if (args[0] === "config") return { stdout: "git@github.com:Teosttn/Pixel-Map.git\n", stderr: "" };
    return {
      stdout: " M src/content/blog/hello.md\u0000?? public/uploads/cover.png\u0000 M admin/server/git.mjs\u0000",
      stderr: ""
    };
  });

  assert.deepEqual(await service.publishStatus(), {
    branch: "main",
    remote: "git@github.com:Teosttn/Pixel-Map.git",
    targetBranch: "main",
    publishableFiles: ["src/content/blog/hello.md", "public/uploads/cover.png"],
    blockedFiles: ["admin/server/git.mjs"],
    canPublish: false,
    blockers: ["存在后台管理范围之外的本地改动"]
  });
});

test("publish status blocks non-main branches", async () => {
  const service = createGitService("/repo", async (args) => {
    if (args[0] === "branch") return { stdout: "codex/pixel-map-v2\n", stderr: "" };
    if (args[0] === "config") return { stdout: "git@github.com:Teosttn/Pixel-Map.git\n", stderr: "" };
    return { stdout: " M src/content/config/tabs.json\u0000", stderr: "" };
  });

  const status = await service.publishStatus();
  assert.equal(status.canPublish, false);
  assert.deepEqual(status.blockers, ["仅允许从 main 分支发布"]);
});

test("publish refuses when origin main is ahead", async () => {
  const calls = [];
  const service = createGitService("/repo", async (args) => {
    calls.push(args);
    if (args[0] === "branch") return { stdout: "main\n", stderr: "" };
    if (args[0] === "config") return { stdout: "git@github.com:Teosttn/Pixel-Map.git\n", stderr: "" };
    if (args[0] === "status") return { stdout: " M src/content/blog/hello.md\u0000", stderr: "" };
    if (args[0] === "fetch") return { stdout: "", stderr: "" };
    if (args[0] === "rev-list") return { stdout: "0\t2\n", stderr: "" };
    throw new Error(`unexpected git command: ${args.join(" ")}`);
  }, async () => { throw new Error("validation must not run"); });

  await assert.rejects(service.publish({ message: "content: publish updates" }), /远端 main 包含 2 个本地尚未同步的提交/);
  assert.equal(calls.some((args) => args[0] === "add"), false);
  assert.equal(calls.some((args) => args[0] === "push"), false);
});

test("publish validates, stages only managed paths, commits, and pushes main", async () => {
  const gitCalls = [];
  const validationCalls = [];
  const service = createGitService("/repo", async (args) => {
    gitCalls.push(args);
    if (args[0] === "branch") return { stdout: "main\n", stderr: "" };
    if (args[0] === "config") return { stdout: "git@github.com:Teosttn/Pixel-Map.git\n", stderr: "" };
    if (args[0] === "status") return { stdout: " M src/content/blog/hello.md\u0000?? public/uploads/cover.png\u0000", stderr: "" };
    if (args[0] === "rev-list") return { stdout: "1\t0\n", stderr: "" };
    if (args[0] === "rev-parse") return { stdout: "abc123\n", stderr: "" };
    return { stdout: "", stderr: "" };
  }, async (command, args) => { validationCalls.push([command, args]); });

  const result = await service.publish({ message: "content: publish updates" });

  assert.deepEqual(validationCalls, [["npm", ["run", "build"]]]);
  assert.deepEqual(gitCalls.slice(-5), [
    ["rev-list", "--left-right", "--count", "HEAD...origin/main"],
    ["add", "--", "src/content/blog/hello.md", "public/uploads/cover.png"],
    ["commit", "-m", "content: publish updates"],
    ["push", "origin", "HEAD:main"],
    ["rev-parse", "HEAD"]
  ]);
  assert.deepEqual(result, { ok: true, commit: "abc123", publishedFiles: ["src/content/blog/hello.md", "public/uploads/cover.png"] });
});
