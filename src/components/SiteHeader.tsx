/**
 * SiteHeader — the site chrome's header as a hydrated React island.
 *
 * It renders the skip link, the brand link and the primary `<nav>`, taking
 * every label (and the nav's aria-label) from `useT`, which is bound to the
 * store's active locale. Because the store drives the render, switching
 * language re-renders these labels in place — no navigation, no reload.
 *
 * Responsive header
 * -----------------
 * Below 622px the five-item desktop nav is replaced by a `<details>`
 * disclosure: one compact row (brand + language trigger + menu button) with
 * the same five links in a panel below it. `<details>` is native,
 * so the links stay reachable without JavaScript; React only adds the
 * `aria-expanded` mirror, Escape/outside close, the route-change close and the
 * focus return to the summary.
 *
 * `currentPath` is the build-time pathname supplied by `BaseLayout`, never
 * `window.location`, so the server HTML already marks the current page and the
 * first client render matches it.
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
 * the header's action cluster, so it keeps its own `client:idle` hydration
 * island (Astro hydrates islands nested in a framework component's children).
 */

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { clientDeps } from "@/client/bootstrap";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

// Nav always targets the HOME page's sections, so from `/blog/` or any sub-page
// an anchor still resolves to the home hero sections. Blog is the listing index
// at `/blog/`, ACG is its own page at `/acg/`, and Useful Links is `/links/`.
// Single-URL model: home is always `/` (locale is client-side).
const NAV_ITEMS = [
  { href: "/#about", key: "nav.about" },
  { href: "/blog/", key: "nav.blog" },
  { href: "/acg/", key: "nav.acg" },
  { href: "/#contact", key: "nav.contact" },
  { href: "/links/", key: "nav.usefulLink" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

/** Normalise a pathname so `/blog`, `/blog/` and `/blog` compare equal. */
function normalisePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Which nav entry is the current page, if any. The home anchors (About,
 * Contact) never mark themselves current; Blog covers the listing and every
 * `/blog/*` tag/archive/post path; ACG and Useful Links are exact pages.
 */
function isCurrent(item: NavItem, currentPath: string): boolean {
  const path = normalisePath(currentPath);
  switch (item.key) {
    case "nav.blog":
      return path === "/blog" || path.startsWith("/blog/");
    case "nav.acg":
      return path === "/acg";
    case "nav.usefulLink":
      return path === "/links";
    default:
      return false;
  }
}

interface SiteHeaderProps {
  /** The layout nests `<LanguageSwitcher client:idle />` here. */
  children?: ReactNode;
  /** Build-time `Astro.url.pathname`, used for `aria-current="page"`. */
  currentPath?: string;
}

export default function SiteHeader({
  children,
  currentPath = "/",
}: SiteHeaderProps) {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // A navigation always lands with the disclosure closed.
  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  // Close when the pointer presses outside the disclosure.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const closeMenu = (returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) summaryRef.current?.focus();
  };

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
              {NAV_ITEMS.map((item) => {
                const current = isCurrent(item, currentPath);
                return (
                  <li key={item.href}>
                    <a
                      className="site-nav__link"
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                    >
                      {tr(item.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="site-actions">
            {children}
            <details
              className="site-menu"
              ref={menuRef}
              open={menuOpen}
              onToggle={(event) => setMenuOpen(event.currentTarget.open)}
              onKeyDown={(event) => {
                if (menuOpen && event.key === "Escape") {
                  event.preventDefault();
                  closeMenu(true);
                }
              }}
            >
              <summary
                className="site-menu__trigger"
                ref={summaryRef}
                aria-label={tr("a11y.menu")}
                aria-expanded={menuOpen}
                aria-controls="site-menu-panel"
              >
                {menuOpen ? (
                  <X aria-hidden="true" size={20} />
                ) : (
                  <Menu aria-hidden="true" size={20} />
                )}
              </summary>
              <nav
                id="site-menu-panel"
                className="site-menu__panel"
                aria-label={tr("a11y.primaryNav")}
              >
                <ul className="site-menu__list">
                  {NAV_ITEMS.map((item) => {
                    const current = isCurrent(item, currentPath);
                    return (
                      <li key={item.href}>
                        <a
                          className="site-menu__link"
                          href={item.href}
                          aria-current={current ? "page" : undefined}
                        >
                          {tr(item.key)}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
