"use client";

import { useEffect } from "react";

export function MotionRuntime() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const targets = Array.from(
      document.querySelectorAll(
        ".pixel-card, .timeline-item, .article-list > *, .home-preview a, [data-reveal]"
      )
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    targets.forEach((target, index) => {
      target.classList.add("reveal-target");
      (target as HTMLElement).style.setProperty("--reveal-delay", `${Math.min(index % 8, 5) * 46}ms`);
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
