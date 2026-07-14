import { useMemo, useState } from "react";
import MarkdownIt from "markdown-it";

const renderer = new MarkdownIt({ html: true, linkify: true, typographer: true });

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const html = useMemo(() => renderer.render(value), [value]);
  return <section className="markdown-editor"><div className="segmented" role="tablist"><button type="button" aria-selected={mode === "edit"} className={mode === "edit" ? "is-selected" : ""} onClick={() => setMode("edit")}>编辑</button><button type="button" aria-selected={mode === "preview"} className={mode === "preview" ? "is-selected" : ""} onClick={() => setMode("preview")}>预览</button></div>{mode === "edit" ? <textarea className="markdown-editor__input" aria-label="Markdown 正文" value={value} onChange={(event) => onChange(event.target.value)} spellCheck="false" /> : <article className="markdown-editor__preview prose" dangerouslySetInnerHTML={{ __html: html }} />}</section>;
}
