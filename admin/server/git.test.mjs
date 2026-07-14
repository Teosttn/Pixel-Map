import assert from "node:assert/strict";
import test from "node:test";
import { createGitService } from "./git.mjs";

test("stages only explicit repository paths", async () => {
  const calls = []; const service = createGitService("/repo", async (args) => { calls.push(args); return { stdout: "", stderr: "" }; });
  await service.stage(["src/content/blog/post.md", "public/uploads/image.png"]);
  assert.deepEqual(calls, [["add", "--", "src/content/blog/post.md", "public/uploads/image.png"]]);
  await assert.rejects(() => service.stage(["../secret"]), /Invalid publish path/);
});
