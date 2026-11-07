/**
 * SiteHeader — the site chrome's header as a hydrated React island.
 *
 * It renders the skip link, the brand link, the primary `<nav>`, the global
 * search trigger and the language switcher slot, taking every label (and the
 * nav's aria-label) from the hydration-safe locale hook. Because the store
 * drives the render after mount, switching language re-renders these labels in
 * place — no navigation, no reload.
 *
 * Responsive header
 * -----------------
 * Below 622px the four-item desktop nav is replaced by a native `<details>`
 * disclosure: one compact row (brand + search + language trigger + menu
 * button) with the same four links in a full-width panel below it. `<details>`
 * is native, so the links stay reachable without JavaScript; React only adds
 * the `aria-expanded` mirror, Escape/outside close, the route-change close and
 * the focus return to the summary. A CSS-rendered backdrop dims the page while
 * the disclosure is open.
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
 * React would log a hydration mismatch. `useHydrationSafeT` pins the build
 * locale until mount, which makes the hydration render byte-identical to the
 * server, then corrects to the store locale. A non-default visitor sees one
 * frame of `zh-hant` chrome before it settles — the accepted first-load flash —
 * and there is no mismatch.
 *
 * `LanguageSwitcher` is passed by the layout as `children` and is nested inside
 * the header's action cluster, so it keeps its own `client:load` hydration
 * island (Astro hydrates islands nested in a framework component's children).
 */

import { Menu, Search, X } from "lucide-react";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { isBlogPath, isLinksPath, routes } from "@/lib/routes";

// Nav always targets the HOME page's sections, so from `/blog/` or any sub-page
// an anchor still resolves to the home hero sections. Blog is the listing index
// at `/blog/`, and Useful Links is `/links/`. Photography still exists at
// `/photographer/` but is not a top-bar item; it is reached from the home grid.
// Single-URL model: home is always `/` (locale is client-side).
const NAV_ITEMS = [
  { href: routes.about, key: "nav.about" },
  { href: routes.blog, key: "nav.blog" },
  { href: routes.contact, key: "nav.contact" },
  { href: routes.links, key: "nav.usefulLink" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

/**
 * Which nav entry is the current page, if any. The home anchors (About,
 * Contact) never mark themselves current; Blog covers the listing and every
 * `/blog/*` tag/archive/post path; Useful Links is an exact page.
 */
function isCurrent(item: NavItem, currentPath: string): boolean {
  switch (item.key) {
    case "nav.blog":
      return isBlogPath(currentPath);
    case "nav.usefulLink":
      return isLinksPath(currentPath);
    default:
      return false;
  }
}

/** Shared focus treatment for the header's text controls. */
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** Desktop nav link: the current page is the only underlined entry. */
const NAV_LINK_CLASS =
  "inline-flex items-center rounded-sm px-1 text-sm font-medium text-muted-foreground no-underline transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-[color-mix(in_oklab,var(--text-muted)_55%,transparent)] aria-[current=page]:decoration-1 aria-[current=page]:underline-offset-4 pointer-coarse:min-h-11 pointer-coarse:min-w-11 " +
  FOCUS_RING;

/** Mobile panel link: a full-width 44px row. */
const MENU_LINK_CLASS =
  "flex min-h-11 items-center rounded-sm px-2 text-base font-medium text-muted-foreground no-underline transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-[var(--surface-hover)] hover:text-foreground aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-foreground " +
  FOCUS_RING;

interface SiteHeaderProps {
  /** The layout nests `<LanguageSwitcher client:load />` here. */
  children?: ReactNode;
  /** Build-time `Astro.url.pathname`, used for `aria-current="page"`. */
  currentPath?: string;
}

export default function SiteHeader({
  children,
  currentPath = "/",
}: SiteHeaderProps) {
  const deps = useClientDeps();
  const { t } = useHydrationSafeT();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerHidden = useStore(deps.store, (state) => state.headerHidden);

  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  // A navigation always lands with the disclosure closed.
  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  // A same-page fragment link keeps the pathname, so close on the hash jump
  // too (e.g. `/#about` from `/`) and never leave the panel over the target.
  useEffect(() => {
    if (!menuOpen) return;
    return deps.adapters.dom.onHashChange(() => setMenuOpen(false));
  }, [deps, menuOpen]);

  // Publish the panel state for the scroll-header guard so a scroll-down can
  // never hide the bar out from under an open menu.
  useEffect(() => {
    deps.store.getState().setHeaderMenuOpen(menuOpen);
  }, [deps, menuOpen]);

  // Safety net: if the bar is ever hidden anyway, close the panel instead of
  // leaving it translated off-screen.
  useEffect(() => {
    if (headerHidden && menuOpen) setMenuOpen(false);
  }, [headerHidden, menuOpen]);

  const closeMenu = (returnFocus: boolean) => {
    setMenuOpen(false);
    // The trigger is already visible inside the sticky bar; restoring focus
    // must not scroll the page to the header's static position.
    if (returnFocus) summaryRef.current?.focus({ preventScroll: true });
  };

  /**
   * Close when the pointer presses anywhere in the header outside the
   * disclosure (brand, search trigger, language switcher). The page below the
   * bar is covered by the backdrop, which closes on click. React events keep
   * the component off the global `document` object.
   */
  const onHeaderPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!menuOpen) return;
    if (menuRef.current?.contains(event.target as Node)) return;
    closeMenu(false);
  };

  const openSearch = () => deps.store.getState().openSearch();

  return (
    <>
      <a className="skip-link" href="#main">
        {t("a11y.skipToContent")}
      </a>
      <header
        className="site-header sticky top-0 z-[var(--z-sticky)] border-b border-border/55 bg-background/72 py-3 backdrop-blur-[var(--glass-blur)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] will-change-transform data-[hidden]:-translate-y-full motion-reduce:transform-none motion-reduce:transition-none motion-reduce:data-[hidden]:transform-none min-[622px]:py-4"
        data-site-header=""
        onPointerDown={onHeaderPointerDown}
      >
        <div className="mx-auto flex w-full max-w-(--container) flex-nowrap items-center gap-4 px-[clamp(var(--space-4),4vw,var(--space-6))] min-[622px]:gap-5">
          <a
            className={
              "inline-flex items-center font-heading text-lg font-bold tracking-tight text-foreground no-underline transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-[var(--accent-text)] pointer-coarse:min-h-11 " +
              FOCUS_RING
            }
            href="/"
          >
            {t("home.title")}
          </a>

          <nav
            className="ml-auto hidden min-[622px]:block"
            aria-label={t("a11y.primaryNav")}
            data-site-nav=""
          >
            <ul className="m-0 flex list-none flex-nowrap gap-5 p-0">
              {NAV_ITEMS.map((item) => {
                const current = isCurrent(item, currentPath);
                return (
                  <li key={item.href}>
                    <a
                      className={NAV_LINK_CLASS}
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                    >
                      {t(item.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 min-[622px]:ml-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={
                "gap-2 px-2 text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11 " +
                FOCUS_RING
              }
              // The visible shortcut is part of the label: axe's
              // label-content-name-mismatch requires every visible string to
              // appear in the accessible name, and screen readers announcing
              // the accelerator is useful, not noise.
              aria-label={`${t("search.trigger")} ⌘K`}
              aria-keyshortcuts="Meta+K Control+K"
              aria-haspopup="dialog"
              data-search-trigger=""
              onClick={openSearch}
            >
              <Search aria-hidden="true" />
              <span className="hidden text-sm min-[622px]:inline">
                {t("search.trigger")}
              </span>
              <Kbd
                aria-hidden="true"
                className="hidden min-[768px]:inline-flex pointer-coarse:hidden"
              >
                ⌘K
              </Kbd>
            </Button>

            {children}

            {/* `<details>` is interactive content per HTML; jsx-a11y's
                aria-query table does not classify it as interactive, so the
                Escape keydown handler is a documented false positive. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <details
              className="site-menu group min-[622px]:hidden"
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
                className={
                  "flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-[var(--control-border)] bg-[var(--surface)] text-muted-foreground transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--control-border-strong)] hover:bg-[var(--surface-hover)] hover:text-foreground [&::-webkit-details-marker]:hidden " +
                  FOCUS_RING
                }
                ref={summaryRef}
                aria-label={t("a11y.menu")}
                aria-expanded={menuOpen}
                aria-controls="site-menu-panel"
              >
                {menuOpen ? (
                  <X aria-hidden="true" size={20} />
                ) : (
                  <Menu aria-hidden="true" size={20} />
                )}
              </summary>

              {/*
               * Backdrop: CSS-rendered from the native `open` attribute, so it
               * also appears without JavaScript. It starts below the bar, sits
               * under the panel, and closes the disclosure on a pointer press.
               */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="absolute inset-x-0 top-full z-[calc(var(--z-dropdown)-1)] hidden h-[calc(100dvh-var(--header-height))] cursor-default bg-black/55 group-open:block"
                onClick={() => closeMenu(false)}
              />

              <nav
                id="site-menu-panel"
                className="absolute inset-x-0 top-full z-[var(--z-dropdown)] max-h-[calc(100dvh-var(--header-height))] overflow-y-auto overscroll-contain border-b border-border/55 bg-[var(--bg-deep)] px-[clamp(var(--space-4),4vw,var(--space-6))] pt-2 pb-3"
                aria-label={t("a11y.primaryNav")}
                data-site-menu-panel=""
              >
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {NAV_ITEMS.map((item) => {
                    const current = isCurrent(item, currentPath);
                    return (
                      <li key={item.href}>
                        <a
                          className={MENU_LINK_CLASS}
                          href={item.href}
                          aria-current={current ? "page" : undefined}
                          onClick={() => setMenuOpen(false)}
                        >
                          {t(item.key)}
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
