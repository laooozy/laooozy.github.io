/**
 * SiteHeader — the site chrome's header as a hydrated React island.
 *
 * It renders the skip link, the brand link and the primary `<nav>`, taking
 * every label (and the nav's aria-label) from `useT`, which is bound to the
 * store's active locale. Because the store drives the render, switching
 * language re-renders these labels in place — no navigation, no reload.
 *
 * Hydration safety
 * ----------------
 * The single URL space renders every page in the DEFAULT locale at build time,
 * so the server HTML can only ever contain `zh-hant` chrome. The store, however,
 * is seeded from the pre-paint boot before React's first client render, so a
 * non-default visitor's first client render would differ from the SSR HTML and
 * React would log a hydration mismatch. We therefore render the default locale
 * until the `mounted` flag flips (mirroring `LanguageSwitcher`), which makes the
 * hydration render byte-identical to the server, then correct to the store
 * locale after mount. A non-default visitor sees one frame of `zh-hant` chrome
 * before it settles — the accepted first-load flash — and there is no mismatch.
 *
 * `LanguageSwitcher` is passed by the layout as `children` and is nested inside
 * the header's flex row, so it keeps its own `client:idle` hydration island
 * (Astro hydrates islands nested in a framework component's children).
 */

import { useEffect, useState, type ReactNode } from "react";

import { clientDeps } from "@/client/bootstrap";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

// Nav always targets the HOME page's sections (or an external site), so from
// `/blog/` or any sub-page an anchor still resolves to the home hero sections.
// Single-URL model: home is always `/` (locale is client-side).
//
// `usefulLink` points at the project's GitHub repository. The owner segment is
// the exact package.json `"name"` value (`laooozy`) and the host matches
// `astro.config.mjs`'s `site`; it is copied, never retyped from memory.
const USEFUL_LINK_HREF = "https://github.com/laooozy/laooozy.github.io";

const NAV_ITEMS = [
  { href: "/#about", key: "nav.about" },
  { href: "/#blog", key: "nav.blog" },
  { href: "/#contact", key: "nav.contact" },
  { href: USEFUL_LINK_HREF, key: "nav.usefulLink", external: true },
] as const;

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface SiteHeaderProps {
  /** The layout nests `<LanguageSwitcher client:idle />` here. */
  children?: ReactNode;
}

export default function SiteHeader({ children }: SiteHeaderProps) {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

  return (
    <>
      <a className="skip-link" href="#main">
        {tr("a11y.skipToContent")}
      </a>
      <header className="site-header" data-site-header="">
        <div className="site-header__inner container">
          <a className="brand" href="/">
            {tr("home.title")}
          </a>
          <nav className="site-nav" aria-label={tr("a11y.primaryNav")}>
            <ul className="site-nav__list">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    className="site-nav__link"
                    href={item.href}
                    {...("external" in item && item.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {tr(item.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {children}
        </div>
      </header>
    </>
  );
}
