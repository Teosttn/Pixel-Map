"use client";

import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site";
import { withoutBasePath } from "../../../shared/site-config.mjs";

type RoutePhase = "idle" | "leaving" | "entering";

const routeThemes: Record<string, string> = {
  "/blog": "var(--pixel-green)",
  "/news": "var(--signal-cyan)",
  "/projects": "var(--amber-glow)",
  "/about": "var(--rose-alert)",
  "/lab": "var(--muted-violet)"
};

function themeForPath(pathname: string) {
  const route = Object.keys(routeThemes).find((key) => pathname === key || pathname.startsWith(`${key}/`));
  return route ? routeThemes[route] : "var(--signal-cyan)";
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const leavingTimer = useRef<number | null>(null);
  const enteringTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<RoutePhase>("idle");
  const [origin, setOrigin] = useState("header");
  const [theme, setTheme] = useState("var(--signal-cyan)");

  useEffect(() => {
    if (previousPathname.current !== pathname && phase === "leaving") {
      setPhase("entering");
      enteringTimer.current = window.setTimeout(() => setPhase("idle"), 300);
    }
    previousPathname.current = pathname;
  }, [pathname, phase]);

  useEffect(() => {
    return () => {
      if (leavingTimer.current) window.clearTimeout(leavingTimer.current);
      if (enteringTimer.current) window.clearTimeout(enteringTimer.current);
    };
  }, []);

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      phase !== "idle"
    ) {
      return;
    }

    const element = event.target instanceof Element ? event.target : null;
    const target = element?.closest("a") as HTMLAnchorElement | null;
    if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
    if (target.origin !== window.location.origin) return;

    const url = new URL(target.href);
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const internalPathname = withoutBasePath(url.pathname, siteConfig.basePath);
    const destination = `${internalPathname}${url.search}${url.hash}`;
    setOrigin(target.dataset.transitionOrigin || "header");
    setTheme(target.dataset.transitionTheme || themeForPath(internalPathname));

    if (reducedMotion) {
      router.push(destination);
      return;
    }

    setPhase("leaving");
    leavingTimer.current = window.setTimeout(() => router.push(destination), 220);
  };

  return (
    <div
      className="site-shell"
      data-route-phase={phase}
      data-route-origin={origin}
      data-route-theme={theme}
      aria-busy={phase === "leaving" || undefined}
      style={{ "--route-theme": theme } as CSSProperties}
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
}
