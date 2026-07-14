"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="route-frame" data-route-path={pathname}>
      {children}
    </div>
  );
}
