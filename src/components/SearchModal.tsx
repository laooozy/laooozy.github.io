/**
 * SearchModal — client-side full-text search over the built site, as a React
 * island hydrated at `client:idle`.
 *
 * Search goes through the INJECTED Pagefind port, never a direct import: the
 * `useSearch` hook drives the store's `search` slice via
 * `createSearchEngine` (`@/hooks/useSearch`), which calls
 * `clientDeps.adapters.pagefind`. That is the production consumer of the port
 * (the old inline `<script>` bypassed it); the runtime itself still loads
 * lazily the first time a query runs, keeping it out of the initial bundle.
 *
 * The overlay state (open / query / status / results) lives in the single
 * client store; this component is the view over it. Every label comes from
 * `useT`, so it re-renders with the client locale.
 *
 * Accessibility: the modal is a native `<dialog>` opened with `showModal()`, so
 * focus is trapped and `Esc` closes it for free; the trigger advertises
 * `aria-haspopup="dialog"` and `aria-expanded`, the dialog is labelled by its
 * heading, and the status line is an `aria-live` region.
 * `data-pagefind-ignore` keeps the search chrome out of the index.
 */

import { useEffect, useRef, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import { useSearch } from "@/hooks/useSearch";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

export default function SearchModal() {
  const t = useT(clientDeps);
  const { open, query, status, results, openSearch, closeSearch, setQuery } =
    useSearch(clientDeps);

  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);
  // Apple glyph is client-only knowledge; default to the portable label so the
  // SSR HTML and hydration render match.
  const [apple, setApple] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setApple(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  // The store owns `open`; reflect it onto the native dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ⌘K (macOS) / Ctrl+K (elsewhere) opens the modal, from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  const tr = mounted ? t : defaultTranslate;

  const statusText = (() => {
    switch (status) {
      case "searching":
        return tr("search.searching");
      case "results":
        return tr("search.resultCount", { count: results.length });
      case "empty":
      case "error":
        return tr("search.noResults");
      default:
        return tr("search.hint");
    }
  })();

  return (
    <div className="search" data-pagefind-ignore>
      <button
        type="button"
        className="search__trigger"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => openSearch()}
      >
        <svg
          className="search__icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="search__label">{tr("search.trigger")}</span>
        <kbd className="search__kbd" aria-hidden="true">
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        className="search-modal"
        ref={dialogRef}
        aria-labelledby="search-modal-title"
        onClose={() => {
          closeSearch();
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeSearch();
        }}
      >
        <div className="search-modal__panel">
          <div className="search-modal__head">
            <h2 className="search-modal__title" id="search-modal-title">
              {tr("search.title")}
            </h2>
            <button
              type="button"
              className="search-modal__close"
              aria-label={tr("search.close")}
              onClick={() => closeSearch()}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="search-modal__field">
            <label
              className="search-modal__visually-hidden"
              htmlFor="search-modal-input"
            >
              {tr("search.placeholder")}
            </label>
            <input
              id="search-modal-input"
              className="search-modal__input"
              ref={inputRef}
              type="search"
              placeholder={tr("search.placeholder")}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <p className="search-modal__status" aria-live="polite">
            {statusText}
          </p>

          <div className="search-results">
            {results.length > 0 && (
              <ul className="search-results__list">
                {results.map((item) => (
                  <li key={item.url} className="search-results__item">
                    <a className="search-results__link" href={item.url}>
                      <h3 className="search-results__title">
                        {item.title || item.url}
                      </h3>
                      <p
                        className="search-results__excerpt"
                        // Pagefind's excerpt only ever adds <mark> tags to
                        // entity-encoded text, so it is documented as safe.
                        dangerouslySetInnerHTML={{
                          __html: item.excerpt ?? "",
                        }}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
