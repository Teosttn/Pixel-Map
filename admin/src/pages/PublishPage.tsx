import { Check, GitBranch, RefreshCw, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, request, type PublishResult, type PublishStatus } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";

const pipeline = ["检查变更", "构建网站", "提交内容", "推送 main"];

export function PublishPage() {
  const [status, setStatus] = useState<PublishStatus>();
  const [message, setMessage] = useState("content: publish site updates");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try { setStatus(await api<PublishStatus>("/git/publish-status")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "无法读取发布状态"); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const publish = async () => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await api<PublishResult>("/git/publish", request("POST", { message }));
      setSuccess(`发布完成，提交 ${result.commit.slice(0, 8)} 已推送到 main。`);
      setConfirmed(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发布失败");
    } finally { setBusy(false); }
  };

  const disabled = busy || !status?.canPublish || !confirmed || message.trim().length < 3;

  return <section className="admin-page publish-page">
    <header className="page-heading"><div><p className="kicker">Repository</p><h1>Publish</h1></div><button className="icon-button" type="button" title="刷新发布状态" aria-label="刷新发布状态" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15} /></button></header>
    {error && <StatusBanner tone="error">{error}</StatusBanner>}
    {success && <StatusBanner tone="success">{success}</StatusBanner>}

    <ol className="publish-pipeline" aria-label="发布流程">{pipeline.map((label, index) => <li key={label}><span>{index + 1}</span><strong>{label}</strong></li>)}</ol>

    {!status ? <p className="muted">正在读取发布状态。</p> : <>
      <dl className="publish-repository">
        <div><dt><GitBranch size={15} />当前分支</dt><dd>{status.branch || "未知"}</dd></div>
        <div><dt><UploadCloud size={15} />发布目标</dt><dd>{status.targetBranch}</dd></div>
        <div><dt>远端仓库</dt><dd className="truncate">{status.remote || "未配置"}</dd></div>
      </dl>

      {status.blockers.length > 0 && <StatusBanner tone="error">{status.blockers.join("；")}</StatusBanner>}

      <div className="publish-files">
        <section><h2>可发布文件 <span>{status.publishableFiles.length}</span></h2>{status.publishableFiles.length ? <ul>{status.publishableFiles.map((file) => <li key={file}><Check size={14} />{file}</li>)}</ul> : <p className="muted">没有后台内容变更。</p>}</section>
        <section><h2>阻断文件 <span>{status.blockedFiles.length}</span></h2>{status.blockedFiles.length ? <ul className="publish-files__blocked">{status.blockedFiles.map((file) => <li key={file}>{file}</li>)}</ul> : <p className="muted">未发现管理范围之外的改动。</p>}</section>
      </div>

      <div className="publish-action">
        <label>提交说明<input value={message} maxLength={120} onChange={(event) => setMessage(event.target.value)} /></label>
        <label className="publish-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>确认发布到 main</span></label>
        <button className="button" type="button" disabled={disabled} onClick={() => void publish()}><UploadCloud size={16} />{busy ? "正在发布" : "发布到 GitHub"}</button>
      </div>
    </>}
  </section>;
}
