import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, Send, Trash2 } from "lucide-react";
import { api, request, type ContentCollection, type ContentRecord } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { StatusBanner } from "../components/StatusBanner";

const today = new Date().toISOString().slice(0, 10);

type SaveIntent = "draft" | "publish";

function draft(collection: ContentCollection): ContentRecord {
  return {
    collection,
    slug: "",
    path: "",
    version: "",
    metadata: { title: "", date: today, summary: "", tags: [], published: false },
    body: ""
  };
}

export function ContentEditorPage({
  collection,
  slug,
  isDraft,
  navigate
}: {
  collection: ContentCollection;
  slug: string;
  isDraft: boolean;
  navigate: (path: string) => void;
}) {
  const [record, setRecord] = useState<ContentRecord>(() => draft(collection));
  const [extra, setExtra] = useState("{}");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState<SaveIntent | null>(null);
  const [conflictIntent, setConflictIntent] = useState<SaveIntent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const applyRecord = (next: ContentRecord) => {
    setRecord(next);
    const { title, date, summary, tags, published, deleted, ...rest } = next.metadata;
    setExtra(JSON.stringify(rest, null, 2));
  };

  const load = () => {
    setError("");
    setSuccess("");
    setConflictIntent(null);
    if (isDraft) {
      setRecord(draft(collection));
      setExtra("{}");
      return;
    }
    api<ContentRecord>(`/content/${collection}/${slug}`)
      .then(applyRecord)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "加载失败"));
  };

  useEffect(load, [collection, slug, isDraft]);

  const title = String(record.metadata.title || record.metadata.name || "");
  const tags = useMemo(
    () => (Array.isArray(record.metadata.tags) ? record.metadata.tags.join(", ") : ""),
    [record.metadata.tags]
  );

  const save = async (intent: SaveIntent, force = false) => {
    try {
      setSaving(intent);
      setError("");
      setSuccess("");
      const normalizedSlug = record.slug.trim().toLowerCase();
      if (!normalizedSlug) throw new Error("请填写 Slug");
      if (!title.trim()) throw new Error("请填写标题");
      const parsed = JSON.parse(extra || "{}");
      const metadata = {
        ...parsed,
        ...record.metadata,
        title: title.trim(),
        date: String(record.metadata.date || ""),
        summary: String(record.metadata.summary || ""),
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        deleted: false,
        published: intent === "publish"
      };
      const body = {
        slug: normalizedSlug,
        metadata,
        body: record.body,
        version: record.version,
        force
      };
      const next = isDraft
        ? await api<ContentRecord>(`/content/${collection}`, request("POST", body))
        : await api<ContentRecord>(`/content/${collection}/${slug}`, request("PUT", body));
      applyRecord(next);
      setConflictIntent(null);
      setSuccess(intent === "publish" ? "内容已发布，当前修改已保存。" : "草稿已保存。");
      if (isDraft) navigate(`/content/${collection}/${next.slug}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "保存失败";
      setError(message);
      setConflictIntent(message.includes("changed on disk") ? intent : null);
    } finally {
      setSaving(null);
    }
  };

  const remove = async () => {
    try {
      await api(`/content/${collection}/${slug}`, request("DELETE", { version: record.version }));
      navigate("/content");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  };

  const lifecycle = record.metadata.deleted === true
    ? "deleted"
    : record.metadata.published === true
      ? "active"
      : "draft";
  const lifecycleLabel = { active: "已发布", draft: "草稿", deleted: "已删除" }[lifecycle];

  return (
    <section className="admin-page">
      <header className="page-heading">
        <div>
          <p className="kicker">{collection}</p>
          <h1>{isDraft ? "新建内容" : "编辑内容"}</h1>
        </div>
        <button className="button button--quiet" type="button" onClick={() => navigate("/content")}>返回列表</button>
      </header>

      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      {success && <StatusBanner tone="success">{success}</StatusBanner>}
      {record.metadata.deleted === true && (
        <StatusBanner tone="error">当前内容处于回收状态。保存草稿或发布会自动恢复，并保留本页修改。</StatusBanner>
      )}

      <div className="editor-actions" aria-label="内容操作">
        <span className={`editor-actions__status content-status content-status--${lifecycle}`}>{lifecycleLabel}</span>
        {!isDraft && (
          <button className="icon-button" type="button" title="重新加载" aria-label="重新加载" onClick={load}>
            <RefreshCcw size={15} aria-hidden="true" />
          </button>
        )}
        {conflictIntent && (
          <button className="button button--quiet" type="button" disabled={saving !== null} onClick={() => save(conflictIntent, true)}>
            强制覆盖
          </button>
        )}
        {!isDraft && record.metadata.deleted !== true && (
          <button className="icon-button icon-button--danger" type="button" title="移入回收状态" aria-label="移入回收状态" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
        <button className="button button--quiet" type="button" disabled={saving !== null} onClick={() => save("draft")}>
          <Save size={15} aria-hidden="true" />
          {saving === "draft" ? "保存中" : record.metadata.published === true ? "转为草稿" : "保存草稿"}
        </button>
        <button className="button" type="button" disabled={saving !== null} onClick={() => save("publish")}>
          <Send size={15} aria-hidden="true" />
          {saving === "publish" ? "发布中" : record.metadata.published === true ? "更新发布" : "发布"}
        </button>
      </div>

      <div className="editor-layout">
        <section className="metadata-form">
          <label>Slug<input value={record.slug} disabled={!isDraft} onChange={(event) => setRecord({ ...record, slug: event.target.value.toLowerCase() })} required /></label>
          <label>标题<input value={title} onChange={(event) => setRecord({ ...record, metadata: { ...record.metadata, title: event.target.value } })} required /></label>
          <label>日期<input type="date" value={String(record.metadata.date || "")} onChange={(event) => setRecord({ ...record, metadata: { ...record.metadata, date: event.target.value } })} /></label>
          <label>摘要<textarea value={String(record.metadata.summary || "")} onChange={(event) => setRecord({ ...record, metadata: { ...record.metadata, summary: event.target.value } })} /></label>
          <label>标签<input value={tags} onChange={(event) => setRecord({ ...record, metadata: { ...record.metadata, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) } })} /></label>
          <details className="advanced-metadata">
            <summary>高级元数据</summary>
            <label>其他元数据 JSON<textarea className="code-input" value={extra} onChange={(event) => setExtra(event.target.value)} /></label>
          </details>
        </section>
        <MarkdownEditor value={record.body} onChange={(body) => setRecord({ ...record, body })} />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="移入回收状态"
          message="此操作会取消发布并保留 Markdown 文件。之后仍可通过保存草稿或发布直接恢复。"
          confirmLabel="移入回收状态"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </section>
  );
}
