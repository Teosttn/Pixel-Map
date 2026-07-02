import type { CSSProperties, ReactNode } from "react";

type PixelCardProps = {
  children: ReactNode;
  accent?: string;
  className?: string;
};

export function PixelCard({ children, accent, className = "" }: PixelCardProps) {
  return (
    <article
      className={`pixel-card ${className}`}
      style={{ "--card-accent": accent } as CSSProperties}
    >
      {children}
    </article>
  );
}
