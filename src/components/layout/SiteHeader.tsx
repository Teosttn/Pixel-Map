import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Bilingual } from "@/components/content/Bilingual";
import { LanguageToggle } from "./LanguageToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="Pixel-Map home">
          <span className="brand__mark" aria-hidden="true" />
          <span>{siteConfig.name}</span>
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <Bilingual zh={item.zh} en={item.label} />
            </Link>
          ))}
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}
