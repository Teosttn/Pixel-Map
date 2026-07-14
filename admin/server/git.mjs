import { spawn } from "node:child_process";

export function runCommand(command, args, { cwd }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(stderr.trim() || `${command} failed with ${code}`)));
  });
}

export function runGit(args, { cwd }) {
  return runCommand("git", args, { cwd });
}

function changedPaths(stdout) {
  const records = stdout.split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    paths.push(record.slice(3));
    if (/[RC]/.test(status)) index += 1;
  }
  return paths;
}

function isManagedPath(path) {
  return path.startsWith("src/content/") || path.startsWith("public/uploads/");
}

function publishingBlockers(status) {
  const blockers = [];
  if (status.branch !== "main") blockers.push("仅允许从 main 分支发布");
  if (!status.remote) blockers.push("未配置 origin 远端仓库");
  if (status.blockedFiles.length > 0) blockers.push("存在后台管理范围之外的本地改动");
  if (status.publishableFiles.length === 0) blockers.push("没有可发布的内容改动");
  return blockers;
}

function validateMessage(message) {
  const normalized = String(message || "").trim();
  if (normalized.length < 3 || normalized.length > 120 || /[\r\n]/.test(normalized)) {
    throw new Error("提交说明必须为 3 到 120 个字符的单行文本");
  }
  return normalized;
}

export function createGitService(
  root,
  runner = (args) => runGit(args, { cwd: root }),
  commandRunner = (command, args) => runCommand(command, args, { cwd: root })
) {
  async function status() {
    const [branch, remote, gitStatus] = await Promise.all([
      runner(["branch", "--show-current"]),
      runner(["config", "--get", "remote.origin.url"]).catch(() => ({ stdout: "" })),
      runner(["status", "--porcelain=v1", "-z", "--untracked-files=normal"])
    ]);
    return { branch: branch.stdout.trim(), remote: remote.stdout.trim(), changedFiles: changedPaths(gitStatus.stdout) };
  }

  async function publishStatus() {
    const gitStatus = await status();
    const publishableFiles = gitStatus.changedFiles.filter(isManagedPath);
    const blockedFiles = gitStatus.changedFiles.filter((path) => !isManagedPath(path));
    const value = { branch: gitStatus.branch, remote: gitStatus.remote, targetBranch: "main", publishableFiles, blockedFiles };
    const blockers = publishingBlockers(value);
    return { ...value, canPublish: blockers.length === 0, blockers };
  }

  async function publish({ message } = {}) {
    const commitMessage = validateMessage(message);
    const current = await publishStatus();
    if (!current.canPublish) throw new Error(current.blockers.join("；"));

    await runner(["fetch", "origin", "main"]);
    const divergence = await runner(["rev-list", "--left-right", "--count", "HEAD...origin/main"]);
    const [, behindText = "0"] = divergence.stdout.trim().split(/\s+/);
    const behind = Number.parseInt(behindText, 10) || 0;
    if (behind > 0) throw new Error(`远端 main 包含 ${behind} 个本地尚未同步的提交，请先同步后再发布`);

    await commandRunner("npm", ["run", "build"]);
    await runner(["add", "--", ...current.publishableFiles]);
    await runner(["commit", "-m", commitMessage]);
    await runner(["push", "origin", "HEAD:main"]);
    const commit = await runner(["rev-parse", "HEAD"]);
    return { ok: true, commit: commit.stdout.trim(), publishedFiles: current.publishableFiles };
  }

  return {
    status,
    publishStatus,
    publish
  };
}
