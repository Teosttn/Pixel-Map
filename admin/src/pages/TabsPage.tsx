import { useEffect, useState } from "react";
import { api, request, type Tab } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusBanner } from "../components/StatusBanner";

type TabsResponse = { tabs: Tab[]; version: string };
const mapIconOptions = ["home", "user", "book-open", "radio", "folder-kanban", "flask-conical", "map-pin"];
const newTab = (): Tab => ({ id: "", kind: "page", label: "", zh: "", href: "", visible: true, order: 0, map: { glyph: "P", icon: "map-pin", landmark: "archive", x: 50, y: 50, color: "var(--signal-cyan)", title: "", zhTitle: "", description: "", zhDescription: "" } as Tab["map"] });

function mapIcon(map: Tab["map"]) {
  return (map as Tab["map"] & { icon?: string }).icon ?? "map-pin";
}

export function TabsPage() {
  const [data, setData] = useState<TabsResponse>();
  const [draft, setDraft] = useState<Tab>();
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Tab>();
  const load = () => api<TabsResponse>("/tabs").then((next) => { setData(next); setError(""); }).catch((reason) => setError(reason.message));
  useEffect(() => { void load(); }, []);
  const save = async (tabs: Tab[], page?: Tab) => {
    if (!data) return;
    try {
      const next = page
        ? await api<TabsResponse>("/tabs/page", request("POST", { tabs: data.tabs, version: data.version, tab: page }))
        : await api<TabsResponse>("/tabs", request("PUT", { tabs, version: data.version }));
      setData(next);
      setDraft(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };
  const updateDraft = (key: keyof Tab, value: unknown) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const updateMapIcon = (icon: string) => setDraft((current) => current ? { ...current, map: { ...current.map, icon } as Tab["map"] } : current);

  if (!data) return <section className="admin-page"><h1>Tabs</h1><p className="muted">正在读取导航配置。</p>{error && <StatusBanner tone="error">{error}</StatusBanner>}</section>;

  return <section className="admin-page">
    <header className="page-heading"><div><p className="kicker">Navigation</p><h1>Tabs</h1></div><button className="button" type="button" onClick={() => setDraft({ ...newTab(), order: data.tabs.length })}>新建 Tab</button></header>
    {error && <StatusBanner tone="error">{error}</StatusBanner>}
    <div className="table-wrap"><table><thead><tr><th>顺序</th><th>名称</th><th>类型</th><th>路径</th><th>状态</th><th aria-label="Actions" /></tr></thead><tbody>{data.tabs.map((tab, index) => <tr key={tab.id}><td>{tab.order + 1}</td><td><strong>{tab.label}</strong><small>{tab.zh}</small></td><td>{tab.kind}</td><td className="truncate">{tab.href}</td><td>{tab.visible ? "显示" : "隐藏"}</td><td className="icon-actions"><button title="上移" aria-label={`上移 ${tab.label}`} disabled={index === 0} onClick={() => save(data.tabs.map((item, position) => position === index ? { ...item, order: index - 1 } : position === index - 1 ? { ...item, order: index } : item))}>↑</button><button title="下移" aria-label={`下移 ${tab.label}`} disabled={index === data.tabs.length - 1} onClick={() => save(data.tabs.map((item, position) => position === index ? { ...item, order: index + 1 } : position === index + 1 ? { ...item, order: index } : item))}>↓</button><button title="切换显示" aria-label={`切换 ${tab.label} 显示状态`} onClick={() => save(data.tabs.map((item) => item.id === tab.id ? { ...item, visible: !item.visible } : item))}>{tab.visible ? "◉" : "○"}</button><button title="编辑" aria-label={`编辑 ${tab.label}`} onClick={() => setDraft(tab)}>✎</button><button title="移除" aria-label={`移除 ${tab.label}`} disabled={tab.kind === "built-in"} onClick={() => setPendingDelete(tab)}>×</button></td></tr>)}</tbody></table></div>
    {draft && <form className="edit-panel" onSubmit={(event) => { event.preventDefault(); const normalized = { ...draft, id: draft.id.trim().toLowerCase(), href: draft.kind === "page" ? `/${draft.id.trim().toLowerCase()}` : draft.href.trim(), order: draft.order }; const exists = data.tabs.some((tab) => tab.id === normalized.id); save(exists ? data.tabs.map((tab) => tab.id === normalized.id ? normalized : tab) : [...data.tabs, normalized], !exists && normalized.kind === "page" ? normalized : undefined); }}><div className="edit-panel__heading"><h2>{data.tabs.some((tab) => tab.id === draft.id) ? "编辑 Tab" : "新建 Tab"}</h2><button type="button" className="icon-button" title="关闭" aria-label="关闭编辑" onClick={() => setDraft(undefined)}>×</button></div><div className="form-grid"><label>标识<input value={draft.id} onChange={(event) => updateDraft("id", event.target.value)} disabled={data.tabs.some((tab) => tab.id === draft.id)} required /></label><label>类型<select value={draft.kind} onChange={(event) => updateDraft("kind", event.target.value as Tab["kind"])}><option value="page">自定义页面</option><option value="built-in">内置页面</option><option value="external">外部链接</option></select></label><label>英文名称<input value={draft.label} onChange={(event) => updateDraft("label", event.target.value)} required /></label><label>中文名称<input value={draft.zh} onChange={(event) => updateDraft("zh", event.target.value)} required /></label><label>路径<input value={draft.kind === "page" ? `/${draft.id}` : draft.href} onChange={(event) => updateDraft("href", event.target.value)} disabled={draft.kind === "page"} required /></label><label>地图图标<select value={mapIcon(draft.map)} onChange={(event) => updateMapIcon(event.target.value)}>{mapIconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label><label>地标类型<input value={draft.map.landmark} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, landmark: event.target.value } })} required /></label><label>颜色令牌<input value={draft.map.color} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, color: event.target.value } })} required /></label><label>英文地图标题<input value={draft.map.title} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, title: event.target.value } })} required /></label><label>中文地图标题<input value={draft.map.zhTitle} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, zhTitle: event.target.value } })} required /></label><label>英文地图描述<input value={draft.map.description} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, description: event.target.value } })} required /></label><label>中文地图描述<input value={draft.map.zhDescription} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, zhDescription: event.target.value } })} required /></label><label>地图 X<input type="number" min="0" max="100" value={draft.map.x} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, x: Number(event.target.value) } })} required /></label><label>地图 Y<input type="number" min="0" max="100" value={draft.map.y} onChange={(event) => setDraft({ ...draft, map: { ...draft.map, y: Number(event.target.value) } })} required /></label></div><div className="form-actions"><button className="button" type="submit">保存 Tab</button><button type="button" className="button button--quiet" onClick={() => setDraft(undefined)}>取消</button></div></form>}
    {pendingDelete && <ConfirmDialog title="移除 Tab" message={`移除“${pendingDelete.label}”不会删除关联内容。`} confirmLabel="移除" onCancel={() => setPendingDelete(undefined)} onConfirm={() => { save(data.tabs.filter((tab) => tab.id !== pendingDelete.id)); setPendingDelete(undefined); }} />}
  </section>;
}
