/**
 * LanguageSwitcher — store-driven, zero-redirect locale switcher.
 *
 * Renders ONE `<button>` per supported locale. Selecting a language calls the
 * store-backed `setLocale` (through the injected `clientDeps`), which persists
 * the choice and reflects `<html lang>` + `data-locale` — the URL never changes
 * and no navigation happens, so switching is instant and flash-free.
 *
 * Hydration safety
 * ----------------
 * The three labels are CONSTANT, locale-independent names (`繁體中文`,
 * `简体中文`, `English`), so the server-rendered markup is identical for every
 * build-time locale. The active indicator is drawn purely by CSS from
 * `html[data-locale="…"]` (see the `<style>` below), and the `aria-current`
 * state is only added AFTER mount via a mounted flag — so the first client
 * render matches the SSR HTML exactly and React logs no hydration mismatch.
 *
 * The accessible name is rendered with the all-locale `<T>` component (three
 * `[data-l]` spans toggled by the same CSS), so it too never causes a mismatch.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import T from "@/components/T";
import { useLocale } from "@/hooks/useLocale";
import { langAttr, languages, type Locale } from "@/i18n";

/** Supported locales in display order (default first). */
const LOCALES: readonly Locale[] = ["zh-hant", "zh-hans", "en"];

const SWITCHER_CSS = `
.lang-switch__group {
	display: inline-flex;
	align-items: center;
	gap: var(--space-1);
	padding: var(--space-1);
	border: 1px solid color-mix(in oklab, var(--glass-border) 55%, transparent);
	border-radius: var(--radius-pill);
	background: var(--surface);
	-webkit-backdrop-filter: blur(var(--glass-blur));
	backdrop-filter: blur(var(--glass-blur));
}

.lang-switch__btn {
	display: inline-flex;
	align-items: center;
	padding: var(--space-1) var(--space-3);
	border: 1px solid transparent;
	border-radius: var(--radius-pill);
	background: transparent;
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

.lang-switch__btn:hover {
	color: var(--text);
	background: var(--surface-hover);
}

.lang-switch__btn:focus-visible {
	color: var(--text);
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

/* Active state driven from the document root — not from React state. */
html[data-locale="zh-hant"] .lang-switch__btn[data-lang="zh-hant"],
html[data-locale="zh-hans"] .lang-switch__btn[data-lang="zh-hans"],
html[data-locale="en"] .lang-switch__btn[data-lang="en"] {
	color: var(--text);
	border-color: color-mix(in oklab, var(--glass-border-strong) 70%, transparent);
	background: var(--accent-soft);
}

/* No data-locale (JavaScript disabled): the default locale reads as active. */
html:not([data-locale]) .lang-switch__btn[data-lang="zh-hant"] {
	color: var(--text);
	border-color: color-mix(in oklab, var(--glass-border-strong) 70%, transparent);
	background: var(--accent-soft);
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
	.lang-switch__btn {
		transition: none;
	}
}
`;

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale(clientDeps);
  // `false` on the server AND on the first client render, so the SSR HTML and
  // the hydration render are byte-identical; flipped after mount only.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className="language-switcher"
      aria-labelledby="language-switcher-label"
    >
      <style dangerouslySetInnerHTML={{ __html: SWITCHER_CSS }} />
      <span id="language-switcher-label" className="lang-switch__sr">
        <T k="a11y.language" />
      </span>
      <div className="lang-switch__group">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            className="lang-switch__btn"
            data-lang={code}
            lang={langAttr[code]}
            onClick={() => {
              // Choosing the current locale is a no-op — no redundant writes.
              if (locale !== code) setLocale(code);
            }}
            aria-current={mounted && locale === code ? "true" : undefined}
          >
            {languages[code]}
          </button>
        ))}
      </div>
    </nav>
  );
}
