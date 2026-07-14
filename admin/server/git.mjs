import { spawn } from "node:child_process";
import { relative, resolve, sep } from "node:path";

const PUBLISHABLE = ["src/content/blog/", "src/content/news/", "src/content/projects/", "src/content/pages/", "src/content/config/tabs.json", "public/uploads/"];

export function runGit(args, { cwd }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("git", args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(stderr.trim() || `git ${args[0]} failed with ${code}`)));
  });
}

function assertPublishPath(path) {
  if (typeof path !== "string" || path.includes("\\") || path.startsWith("/") || path.split("/").includes("..") || !PUBLISHABLE.some((prefix) => path === prefix || path.startsWith(prefix))) throw new Error("Invalid publish path");
  return path;
}

function runCommand(command, args, cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] }); let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); child.on("error", (error) => resolvePromise({ ok: false, stdout, stderr: `${stderr}${error.message}` })); child.on("close", (code) => resolvePromise({ ok: code === 0, stdout, stderr }));
  });
}

export function createGitService(root, runner = (args) => runGit(args, { cwd: root })) {
  return {
    async status() {
      const [branch, remote, status] = await Promise.all([runner(["branch", "--show-current"]), runner(["config", "--get", "remote.origin.url"]).catch(() => ({ stdout: "" })), runner(["status", "--porcelain=v1", "--untracked-files=normal"])]);
      const changedFiles = status.stdout.split("\n").filter(Boolean).map((line) => line.slice(3).trim()).filter((path) => !path.includes(" -> "));
      return { branch: branch.stdout.trim(), remote: remote.stdout.trim(), changedFiles };
    },
    async stage(paths) { const selected = [...new Set(paths.map(assertPublishPath))]; if (!selected.length) throw new Error("Select at least one publishable path"); return runner(["add", "--", ...selected]); },
    async validateSite() {
      const commands = [["npm", ["run", "test:news"]], ["npm", ["run", "test:content"]], ["npm", ["run", "test:workflows"]], ["npm", ["run", "test:admin"]], ["npm", ["run", "typecheck"]], ["npm", ["run", "build"]]];
      const steps = [];
      for (const [command, args] of commands) { const result = await runCommand(command, args, root); steps.push({ command: `${command} ${args.join(" ")}`, ...result }); if (!result.ok) return { ok: false, steps, message: `校验失败：${command} ${args.join(" ")}` }; }
      return { ok: true, steps, message: "全部校验通过" };
    },
    async publishSelection({ paths, message }) {
      if (typeof message !== "string" || !message.trim() || message.length > 120) throw new Error("Commit message is required and must be 120 characters or fewer");
      const selected = [...new Set(paths.map(assertPublishPath))]; await this.stage(selected); await runner(["commit", "-m", message.trim(), "--", ...selected]); const { branch } = await this.status(); if (!branch) throw new Error("Current branch is unavailable"); await runner(["push", "origin", branch]); return { branch, paths: selected };
    }
  };
}
