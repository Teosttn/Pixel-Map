import { useEffect, useState } from "react";
import type { ContentCollection } from "./api/client";
import { AdminShell } from "./components/AdminShell";
import { ContentEditorPage } from "./pages/ContentEditorPage";
import { ContentListPage } from "./pages/ContentListPage";
import { OverviewPage } from "./pages/OverviewPage";
import { MediaPage } from "./pages/MediaPage";
import { TabsPage } from "./pages/TabsPage";

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  useEffect(() => { const pop = () => setPathname(window.location.pathname); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  const navigate = (path: string) => { const target = new URL(path, window.location.origin); window.history.pushState({}, "", target); setPathname(target.pathname); };
  const content = pathname.match(/^\/content\/(blog|news|projects|pages)\/([^/]+)$/);
  let page = <section className="admin-page"><h1>未找到页面</h1><button className="button" onClick={() => navigate("/")}>回到 Overview</button></section>;
  if (pathname === "/") page = <OverviewPage />;
  else if (pathname === "/tabs") page = <TabsPage />;
  else if (pathname === "/content") page = <ContentListPage navigate={navigate} />;
  else if (pathname === "/media") page = <MediaPage />;
  else if (content) page = <ContentEditorPage collection={content[1] as ContentCollection} slug={content[2]} isDraft={new URLSearchParams(window.location.search).get("draft") === "1"} navigate={navigate} />;
  return <AdminShell pathname={pathname} navigate={navigate}>{page}</AdminShell>;
}
