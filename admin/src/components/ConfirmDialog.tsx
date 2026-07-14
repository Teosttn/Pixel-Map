import { useEffect } from "react";

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onCancel(); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onCancel]);
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{title}</h2><p>{message}</p><div className="dialog__actions"><button type="button" className="button button--quiet" onClick={onCancel}>取消</button><button type="button" className="button button--danger" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
