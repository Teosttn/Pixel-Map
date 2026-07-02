"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="route-frame" key={pathname}>
      {children}
    </div>
  );
}
