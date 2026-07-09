"use client";

import { useEffect, useMemo, useState } from "react";

type Settings = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

type GitHubContentItem = {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
};

type LoadedFile = {
  path: string;
  sha?: string;
  content: string;
};

const settingsKey = "pixel-map-admin-settings";
const tabsPath = "src/content/config/tabs.json";
const blogRoot = "src/content/blog";

function splitRepository(value: string) {
  const [owner = "", repo = ""] = value.split("/");
  return { owner, repo };
}

const defaultRepository = splitRepository(process.env.NEXT_PUBLIC_GITHUB_REPOSITORY || "");

function defaultSettings(): Settings {
  return {
    owner: defaultRepository.owner,
    repo: defaultRepository.repo,
    branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main",
    token: ""
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

function textToBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value));
}

function base64ToText(value: string) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

function articleTemplate(slug: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `---\ntitle: "${slug}"\nslug: "${slug}"\ndate: "${today}"\nsummary: ""\ntags: []\ncategory: "Notes"\npublished: true\n---\n\n# ${slug}\n\n`;
}

export function AdminConsole() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState("Idle");
  const [tabsFile, setTabsFile] = useState<LoadedFile>({ path: tabsPath, content: "" });
  const [articles, setArticles] = useState<GitHubContentItem[]>([]);
  const [articleFile, setArticleFile] = useState<LoadedFile>({ path: "", content: "" });
  const [uploadMarkdown, setUploadMarkdown] = useState("");

  const repository = useMemo(
    () => `${settings.owner.trim()}/${settings.repo.trim()}`,
    [settings.owner, settings.repo]
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(settingsKey);
    if (saved) {
      try {
        setSettings({ ...defaultSettings(), ...JSON.parse(saved) });
      } catch {
        setStatus("Saved settings could not be parsed.");
      }
    }
  }, []);

  function saveSettings(next = settings) {
    window.localStorage.setItem(settingsKey, JSON.stringify(next));
    setStatus("Settings saved locally.");
  }

  function updateSettings(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function assertReady() {
    if (!settings.owner || !settings.repo || !settings.branch || !settings.token) {
      throw new Error("Fill owner, repo, branch, and token first.");
    }
  }

  async function githubRequest(path: string, init?: RequestInit) {
    assertReady();
    const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${settings.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init?.headers || {})
      }
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.message || `GitHub API failed with ${response.status}.`);
    }
    return body;
  }

  async function loadTextFile(path: string): Promise<LoadedFile> {
    const body = await githubRequest(`${path}?ref=${encodeURIComponent(settings.branch)}`);
    return {
      path,
      sha: body.sha,
      content: base64ToText(body.content || "")
    };
  }

  async function saveTextFile(file: LoadedFile, message: string) {
    const body: Record<string, unknown> = {
      message,
      content: textToBase64(file.content),
      branch: settings.branch
    };
    if (file.sha) body.sha = file.sha;

    const result = await githubRequest(file.path, {
      method: "PUT",
      body: JSON.stringify(body)
    });

    return result.content?.sha as string | undefined;
  }

  async function loadTabs() {
    setStatus("Loading tabs...");
    try {
      const file = await loadTextFile(tabsPath);
      setTabsFile(file);
      setStatus("Tabs loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load tabs.");
    }
  }

  async function saveTabs() {
    setStatus("Saving tabs...");
    try {
      JSON.parse(tabsFile.content);
      const sha = await saveTextFile(tabsFile, "Update Pixel-Map tabs");
      setTabsFile((current) => ({ ...current, sha }));
      setStatus("Tabs committed. GitHub Actions can rebuild the site now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save tabs.");
    }
  }

  async function loadArticles() {
    setStatus("Loading articles...");
    try {
      const body = await githubRequest(`${blogRoot}?ref=${encodeURIComponent(settings.branch)}`);
      const files = (Array.isArray(body) ? body : [])
        .filter((item: GitHubContentItem) => item.type === "file" && item.name.endsWith(".md"))
        .sort((a: GitHubContentItem, b: GitHubContentItem) => a.name.localeCompare(b.name));
      setArticles(files);
      setStatus(`Loaded ${files.length} articles.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load articles.");
    }
  }

  async function selectArticle(path: string) {
    if (!path) {
      setArticleFile({ path: "", content: "" });
      return;
    }
    setStatus("Loading article...");
    try {
      const file = await loadTextFile(path);
      setArticleFile(file);
      setStatus("Article loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load article.");
    }
  }

  function newArticle() {
    const raw = window.prompt("Article slug");
    const slug = slugify(raw || "");
    if (!slug) return;
    setArticleFile({
      path: `${blogRoot}/${slug}.md`,
      content: articleTemplate(slug)
    });
    setStatus("New article draft created.");
  }

  async function saveArticle() {
    if (!articleFile.path || !articleFile.content.trim()) {
      setStatus("Select or create an article first.");
      return;
    }
    setStatus("Saving article...");
    try {
      const sha = await saveTextFile(articleFile, `Update ${articleFile.path}`);
      setArticleFile((current) => ({ ...current, sha }));
      await loadArticles();
      setStatus("Article committed. GitHub Actions can rebuild the site now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save article.");
    }
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    setStatus("Uploading image...");
    try {
      assertReady();
      const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
      const stamp = Date.now();
      const targetPath = `public/uploads/${stamp}-${safeName}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      await githubRequest(targetPath, {
        method: "PUT",
        body: JSON.stringify({
          message: `Upload ${safeName}`,
          content: bytesToBase64(bytes),
          branch: settings.branch
        })
      });
      const markdown = `![${safeName}](/uploads/${stamp}-${safeName})`;
      setUploadMarkdown(markdown);
      setStatus("Image uploaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to upload image.");
    }
  }

  return (
    <section className="admin-console" data-reveal>
      <div className="admin-status" role="status">
        {status}
      </div>

      <section className="admin-panel">
        <div>
          <h2>Repository</h2>
          <p>Use a fine-grained token with Contents read/write access for this repository.</p>
        </div>
        <div className="admin-grid">
          <label>
            Owner
            <input value={settings.owner} onChange={(event) => updateSettings("owner", event.target.value)} />
          </label>
          <label>
            Repo
            <input value={settings.repo} onChange={(event) => updateSettings("repo", event.target.value)} />
          </label>
          <label>
            Branch
            <input value={settings.branch} onChange={(event) => updateSettings("branch", event.target.value)} />
          </label>
          <label>
            Token
            <input
              type="password"
              value={settings.token}
              onChange={(event) => updateSettings("token", event.target.value)}
            />
          </label>
        </div>
        <button className="pixel-button" type="button" onClick={() => saveSettings()}>
          Save Settings
        </button>
      </section>

      <section className="admin-panel">
        <div>
          <h2>Tabs</h2>
          <p>{tabsPath}</p>
        </div>
        <div className="admin-actions">
          <button className="pixel-button" type="button" onClick={loadTabs}>
            Load Tabs
          </button>
          <button className="pixel-button" type="button" onClick={saveTabs}>
            Commit Tabs
          </button>
        </div>
        <textarea
          className="admin-editor admin-editor--json"
          value={tabsFile.content}
          onChange={(event) => setTabsFile((current) => ({ ...current, content: event.target.value }))}
          spellCheck={false}
        />
      </section>

      <section className="admin-panel">
        <div>
          <h2>Articles</h2>
          <p>{blogRoot}</p>
        </div>
        <div className="admin-actions">
          <button className="pixel-button" type="button" onClick={loadArticles}>
            Load Articles
          </button>
          <button className="pixel-button" type="button" onClick={newArticle}>
            New Article
          </button>
          <button className="pixel-button" type="button" onClick={saveArticle}>
            Commit Article
          </button>
        </div>
        <select
          className="admin-select"
          value={articleFile.path}
          onChange={(event) => selectArticle(event.target.value)}
        >
          <option value="">Select article</option>
          {articles.map((article) => (
            <option key={article.sha} value={article.path}>
              {article.name}
            </option>
          ))}
        </select>
        <input
          className="admin-path"
          value={articleFile.path}
          onChange={(event) => setArticleFile((current) => ({ ...current, path: event.target.value }))}
          placeholder={`${blogRoot}/example.md`}
        />
        <textarea
          className="admin-editor"
          value={articleFile.content}
          onChange={(event) => setArticleFile((current) => ({ ...current, content: event.target.value }))}
          spellCheck={false}
        />
      </section>

      <section className="admin-panel">
        <div>
          <h2>Uploads</h2>
          <p>Images are committed to public/uploads.</p>
        </div>
        <input
          className="admin-file"
          type="file"
          accept="image/*"
          onChange={(event) => uploadImage(event.target.files?.[0] || null)}
        />
        {uploadMarkdown ? (
          <input className="admin-path" readOnly value={uploadMarkdown} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
      </section>
    </section>
  );
}
