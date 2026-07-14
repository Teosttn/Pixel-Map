import { useEffect, useMemo, useState } from "react";
import { api, type ContentCollection, type ContentRecord } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";

const collections: { id: ContentCollection; label: string }[] = [{ id: "blog", label: "博客" }, { id: "news", label: "资讯" }, { id: "projects", label: "项目" }, { id: "pages", label: "页面" }];

function statusFor(item: ContentRecord) {
  if (item.metadata.deleted === true) return "deleted";
  return item.metadata.published === true ? "active" : "draft";
}

function dateValue(item: ContentRecord) {
  const value = Date.parse(String(item.metadata.date || ""));
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function sortRecords(items: ContentRecord[]) {
  return [...items].sort((left, right) => dateValue(right) - dateValue(left) || right.slug.localeCompare(left.slug));
}

export function ContentListPage({ navigate }: { navigate: (path: string) => void }) {
  const [collection, setCollection] = useState<ContentCollection>("blog"); const [items, setItems] = useState<ContentRecord[]>([]); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [error, setError] = useState("");
  useEffect(() => { api<{ items: ContentRecord[] }>(`/content?collection=${collection}`).then((data) => { setItems(data.items); setError(""); }).catch((reason) => setError(reason.message)); }, [collection]);
  const filtered = useMemo(() => sortRecords(items).filter((item) => { const haystack = `${item.slug} ${item.metadata.title || ""} ${(item.metadata.tags || []).toString()}`.toLowerCase(); return haystack.includes(search.toLowerCase()) && (status === "all" || statusFor(item) === status); }), [items, search, status]);
  const labels = { active: "活跃", draft: "草稿", deleted: "已删除" };
  return <section className="admin-page"><header className="page-heading"><div><p className="kicker">Repository content</p><h1>Content</h1></div><button className="button" type="button" onClick={() => navigate(`/content/${collection}/new?draft=1`)}>新建内容</button></header><div className="list-controls"><div className="segmented">{collections.map((item) => <button key={item.id} className={collection === item.id ? "is-selected" : ""} onClick={() => setCollection(item.id)}>{item.label}</button>)}</div><input aria-label="搜索内容" placeholder="搜索标题、标签或 slug" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="内容状态" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="active">活跃</option><option value="draft">草稿</option><option value="deleted">已删除</option></select></div>{error && <StatusBanner tone="error">{error}</StatusBanner>}<div className="content-list">{filtered.map((item) => { const itemStatus = statusFor(item); const date = String(item.metadata.date || ""); return <button key={item.slug} className="content-row" type="button" onClick={() => navigate(`/content/${collection}/${item.slug}`)}><span><strong>{String(item.metadata.title || item.metadata.name || item.slug)}</strong><small>{item.slug}</small></span><time className="content-row__date" dateTime={date}>{date || "未设日期"}</time><span className={`content-status content-status--${itemStatus}`}>{labels[itemStatus]}</span></button>; })}{!error && filtered.length === 0 && <p className="empty-state">当前集合没有匹配内容。</p>}</div></section>;
}
