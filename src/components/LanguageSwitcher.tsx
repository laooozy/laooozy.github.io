/**
 * LanguageSwitcher — store-driven, zero-redirect locale dropdown.
 *
 * Renders ONE glassy trigger button (a globe icon plus the CURRENT language)
 * that opens a menu listing every supported locale. Selecting one calls the
 * store-backed `setLocale` (through the injected `clientDeps`), which persists
 * the choice and reflects `<html lang>` + `data-locale` — the URL never changes
 * and no navigation happens, so switching is instant and flash-free.
 *
 * Hydration safety
 * ----------------
 * The trigger's label is rendered as three constant, locale-independent names
 * (`繁體中文`, `简体中文`, `English`), each in its own `[data-l]` span toggled by
 * CSS from `html[data-locale="…"]` (see `global.css`). The server-rendered
 * markup is therefore identical for every build-time locale and no React value
 * is read at render time, so the first client render matches the SSR HTML
 * exactly: no hydration mismatch and no `zh-hant` flash in this control.
 *
 * The menu is only mounted once the user opens it (client state that starts
 * `false` on both server and client), so it too never causes a mismatch.
 *
 * The accessible name is rendered with the all-locale `<T>` component (three
 * `[data-l]` spans toggled by the same CSS), so it is mismatch-free as well.
 */

import { ChevronDown, Check, Globe } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import T from "@/components/T";
import { useLocale } from "@/hooks/useLocale";
import { langAttr, languages, type Locale } from "@/i18n";

/** Every locale, for the CSS-toggled trigger label (order is irrelevant). */
const ALL_LOCALES: readonly Locale[] = ["zh-hant", "zh-hans", "en"];

/** Menu order, as specified: English · 繁體中文 · 簡體中文. */
const MENU_ORDER: readonly Locale[] = ["en", "zh-hant", "zh-hans"];

const SWITCHER_CSS = `
.lang-switch {
	position: relative;
	display: inline-flex;
}

.lang-switch__trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-1) var(--space-3);
	border: 1px solid color-mix(in oklab, var(--glass-border) 55%, transparent);
	border-radius: var(--radius-pill);
	background: var(--surface);
	-webkit-backdrop-filter: blur(var(--glass-blur));
	backdrop-filter: blur(var(--glass-blur));
	color: var(--text-muted);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	line-height: 1.4;
	white-space: nowrap;
	cursor: pointer;
	transition:
		color var(--dur-fast) var(--ease-out),
		border-color var(--dur-fast) var(--ease-out),
		background-color var(--dur-fast) var(--ease-out);
}

.lang-switch__trigger:hover {
	color: var(--text);
	border-color: color-mix(in oklab, var(--glass-border-strong) 70%, transparent);
	background: var(--surface-hover);
}

.lang-switch__trigger:focus-visible {
	color: var(--text);
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

.lang-switch__trigger[aria-expanded="true"] {
	color: var(--text);
	border-color: color-mix(in oklab, var(--glass-border-strong) 70%, transparent);
	background: var(--accent-soft);
}

.lang-switch__globe {
	flex: none;
	color: var(--accent);
}

.lang-switch__chevron {
	flex: none;
	transition: transform var(--dur-fast) var(--ease-out);
}

.lang-switch__trigger[aria-expanded="true"] .lang-switch__chevron {
	transform: rotate(180deg);
}

.lang-switch__menu {
	position: absolute;
	top: calc(100% + var(--space-2));
	right: 0;
	/* Portaled-style popover token: must clear the sticky header. */
	z-index: var(--z-popover);
	display: flex;
	flex-direction: column;
	min-width: 10rem;
	margin: 0;
	padding: var(--space-1);
	list-style: none;
	border: 1px solid color-mix(in oklab, var(--glass-border-strong) 60%, transparent);
	border-radius: var(--radius-md);
	background: color-mix(in oklab, var(--bg-elevated) 88%, transparent);
	-webkit-backdrop-filter: blur(var(--glass-blur));
	backdrop-filter: blur(var(--glass-blur));
	box-shadow: var(--shadow-lift);
}

.lang-switch__item {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
	padding: var(--space-2) var(--space-3);
	border: 0;
	border-radius: var(--radius-sm);
	background: transparent;
	color: var(--text-muted);
	font-family: var(--font-body);
	font-size: var(--text-sm);
	line-height: 1.4;
	text-align: start;
	white-space: nowrap;
	cursor: pointer;
	transition:
		color var(--dur-fast) var(--ease-out),
		background-color var(--dur-fast) var(--ease-out);
}

.lang-switch__item:hover {
	color: var(--text);
	background: var(--surface-hover);
}

.lang-switch__item:focus-visible {
	color: var(--text);
	background: var(--surface-hover);
	outline: 2px solid var(--accent);
	outline-offset: -2px;
}

.lang-switch__item[aria-checked="true"] {
	color: var(--text);
	background: var(--accent-soft);
}

.lang-switch__check {
	display: inline-flex;
	justify-content: center;
	width: 1rem;
	flex: none;
	color: var(--accent);
}

.lang-switch__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

@media (prefers-reduced-motion: reduce) {
	.lang-switch__trigger,
	.lang-switch__chevron,
	.lang-switch__item {
		transition: none;
	}
}
`;

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale(clientDeps);
  // `false` on the server AND on the first client render, so the SSR HTML and
  // the hydration render are byte-identical (the menu is never in the SSR).
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const getItems = useCallback(
    () => itemRefs.current.filter((el): el is HTMLButtonElement => el !== null),
    [],
  );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Close on a pointer press outside the switcher.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus into the menu when it opens, landing on the active locale.
  useEffect(() => {
    if (!open) return;
    const items = getItems();
    const active = items.find((el) => el.dataset.lang === locale);
    (active ?? items[0])?.focus();
    // `locale` is intentionally not a dependency: this should run once per
    // open, not refocus the list every time the locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, getItems]);

  /** Wrap focus around the menu items. */
  const moveFocus = (index: number) => {
    const items = getItems();
    if (items.length === 0) return;
    const next = (index + items.length) % items.length;
    items[next]?.focus();
  };

  const onItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const items = getItems();
    const current = items.indexOf(event.currentTarget);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(current - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        break;
      case "End":
        event.preventDefault();
        moveFocus(items.length - 1);
        break;
      default:
        break;
    }
  };

  const select = (code: Locale) => {
    // Choosing the current locale is a no-op — no redundant writes.
    if (locale !== code) setLocale(code);
    close(true);
  };

  return (
    <nav
      className="language-switcher"
      aria-labelledby="language-switcher-label"
    >
      <style dangerouslySetInnerHTML={{ __html: SWITCHER_CSS }} />
      <span id="language-switcher-label" className="lang-switch__sr">
        <T k="a11y.language" />
      </span>
      <div
        className="lang-switch"
        ref={rootRef}
        onKeyDown={(event) => {
          // Escape closes from the trigger or any item and restores focus.
          if (open && event.key === "Escape") {
            event.preventDefault();
            close(true);
          }
        }}
        onBlurCapture={(event) => {
          // Tabbing out of the switcher closes it without stealing focus back.
          if (
            open &&
            !rootRef.current?.contains(event.relatedTarget as Node | null)
          ) {
            setOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="lang-switch__trigger"
          ref={triggerRef}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="lang-switch-menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Globe className="lang-switch__globe" aria-hidden="true" size={16} />
          {ALL_LOCALES.map((code) => (
            <span key={code} data-l={code} lang={langAttr[code]}>
              {languages[code]}
            </span>
          ))}
          <ChevronDown
            className="lang-switch__chevron"
            aria-hidden="true"
            size={16}
          />
        </button>
        {open && (
          <ul
            id="lang-switch-menu"
            className="lang-switch__menu"
            role="menu"
            aria-labelledby="language-switcher-label"
          >
            {MENU_ORDER.map((code, index) => (
              <li key={code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={locale === code}
                  className="lang-switch__item"
                  data-lang={code}
                  lang={langAttr[code]}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => select(code)}
                  onKeyDown={onItemKeyDown}
                >
                  <span className="lang-switch__check" aria-hidden="true">
                    {locale === code && <Check size={14} />}
                  </span>
                  {languages[code]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
