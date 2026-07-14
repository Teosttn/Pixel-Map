import { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";

type Overview = { counts: Record<string, number>; latestDigest?: string; todayDigest?: boolean; branch?: string; remote?: string; changedFiles?: string[]; validation?: { ok: boolean; message: string } };

export function OverviewPage() {
  const [overview, setOverview] = useState<Overview>();
  const [error, setError] = useState("");
  useEffect(() => { api<Overview>("/overview").then(setOverview).catch((reason) => setError(reason.message)); }, []);
  if (error) return <section className="admin-page"><h1>Overview</h1><StatusBanner tone="error">{error}</StatusBanner></section>;
  if (!overview) return <section className="admin-page"><h1>Overview</h1><p className="muted">正在读取本地仓库状态。</p></section>;
  const rows = [["博客文章", overview.counts.blog || 0], ["资讯摘要", overview.counts.news || 0], ["项目", overview.counts.projects || 0], ["自定义页面", overview.counts.pages || 0]];
  return <section className="admin-page"><header className="page-heading"><div><p className="kicker">Workspace</p><h1>Overview</h1></div></header><div className="overview-metrics">{rows.map(([label, count]) => <div key={String(label)}><strong>{count}</strong><span>{label}</span></div>)}</div><div className="overview-grid"><section><h2>内容状态</h2><dl className="definition-list"><div><dt>最近资讯</dt><dd>{overview.latestDigest || "无"}</dd></div><div><dt>今日摘要</dt><dd>{overview.todayDigest ? "已存在" : "尚未生成"}</dd></div><div><dt>最近校验</dt><dd>{overview.validation?.message || "尚未运行"}</dd></div></dl></section><section><h2>仓库</h2><dl className="definition-list"><div><dt>分支</dt><dd>{overview.branch || "未知"}</dd></div><div><dt>远端</dt><dd className="truncate">{overview.remote || "未配置"}</dd></div><div><dt>已变更文件</dt><dd>{overview.changedFiles?.length || 0}</dd></div></dl></section></div></section>;
}
