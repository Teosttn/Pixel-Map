import type { PropsWithChildren } from "react";

const links = [
  ["/", "Overview"], ["/tabs", "Tabs"], ["/content", "Content"], ["/media", "Media"]
];

export function AdminShell({ children, pathname, navigate }: PropsWithChildren<{ pathname: string; navigate: (path: string) => void }>) {
  return <div className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/" onClick={(event) => { event.preventDefault(); navigate("/"); }}><span aria-hidden="true">PM</span><strong>Pixel-Map</strong><small>Local admin</small></a><nav aria-label="Admin sections">{links.map(([href, label]) => <a key={href} className={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "is-active" : ""} href={href} onClick={(event) => { event.preventDefault(); navigate(href); }}>{label}</a>)}</nav><p className="admin-sidebar__notice">仅本地运行</p></aside><main className="admin-main">{children}</main></div>;
}
