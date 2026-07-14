import { spawn } from "node:child_process";

export function runGit(args, { cwd }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("git", args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(stderr.trim() || `git ${args[0]} failed with ${code}`)));
  });
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

export function createGitService(root, runner = (args) => runGit(args, { cwd: root })) {
  return {
    async status() {
      const [branch, remote, status] = await Promise.all([runner(["branch", "--show-current"]), runner(["config", "--get", "remote.origin.url"]).catch(() => ({ stdout: "" })), runner(["status", "--porcelain=v1", "-z", "--untracked-files=normal"])]);
      return { branch: branch.stdout.trim(), remote: remote.stdout.trim(), changedFiles: changedPaths(status.stdout) };
    }
  };
}
