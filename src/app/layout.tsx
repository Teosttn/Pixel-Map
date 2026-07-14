import type { Metadata } from "next";
import "./globals.css";
import { MotionRuntime } from "@/components/motion/MotionRuntime";
import { RouteFrame } from "@/components/motion/RouteFrame";
import { TransitionProvider } from "@/components/motion/TransitionProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s / ${siteConfig.name}`
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-language="zh">
      <body>
        <TransitionProvider>
          <SiteHeader />
          <RouteFrame>{children}</RouteFrame>
          <MotionRuntime />
        </TransitionProvider>
      </body>
    </html>
  );
}
