/**
 * DOM adapter — a port over the browser side effects the shell needs: scroll
 * observation, reduced-motion preference, header visibility, locale application
 * and the animation primitives the background atmosphere consumes (a shared
 * `requestAnimationFrame` loop and a document-visibility subscription). The
 * `IntersectionObserver` factory is port API available to a future scripted
 * reveal; the shipped entrance reveal is pure CSS and uses none of it.
 *
 * Every method is total (never throws): a missing/failing DOM degrades to a
 * no-op. Callers inject the port, so the store/hook layer owns the behaviour
 * while this module owns the imperative glue. Only PRIMITIVES live here — the
 * canvas drawing belongs to the client module that consumes this surface, not
 * to the port.
 */

import { langAttr, type Locale } from "@/i18n";

/** The slice of a native `IntersectionObserverEntry` an entrance reveal reads. */
export interface DomIntersectionEntry {
  /** The observed element this entry is about. */
  readonly target: Element;
  /** `true` once any part of `target` has entered the root. */
  readonly isIntersecting: boolean;
}

/** Construction options for `createIntersectionObserver`, mirroring the native API. */
export interface DomIntersectionOptions {
  /** Margin around the root, e.g. `"0px 0px -8% 0px"`. */
  rootMargin?: string;
  /** Visible proportion(s) of the target that trigger the callback. */
  threshold?: number | number[];
}

/**
 * The `IntersectionObserver` surface a reveal needs. Each method is a thin,
 * total delegation to the platform observer; `disconnect`/`unobserve` are safe
 * to call with an element that is not observed.
 */
export interface DomIntersectionObserver {
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

/** Options for `DomPort.loadScript`. */
export interface DomScriptOptions {
  /**
   * Stable element id used for dedupe: a second call that finds a tag with
   * this id resolves as already loaded instead of appending a duplicate.
   */
  id?: string;
  /** Set the tag's `async` flag; defaults to `true`. */
  async?: boolean;
}

/** Browser side effects for scroll + header concerns. */
export interface DomPort {
  /**
   * Observe scrolling. `callback` receives the current `window.scrollY`, rAF
   * coalesced so at most one call happens per animation frame and the listener
   * itself stays passive. Returns an unsubscribe that also cancels a pending
   * frame.
   */
  onScroll(callback: (scrollY: number) => void): () => void;
  /**
   * Observe same-document hash changes (`hashchange`). The callback receives
   * the new `location.hash`, including the leading `#`, or `""` when cleared.
   * The disclosure uses it to close on an anchor jump that does not change the
   * pathname. Returns an unsubscribe. Never throws.
   */
  onHashChange(callback: (hash: string) => void): () => void;
  /** `true` when the user asked for reduced motion. `false` when unknown. */
  prefersReducedMotion(): boolean;
  /**
   * Toggle the header's hidden state: the `data-hidden` attribute (the
   * off-screen transform) and `inert` (so a hidden bar's links/buttons leave
   * the tab order and the accessibility tree). Both are removed when shown.
   */
  setHeaderHidden(hidden: boolean): void;
  /**
   * `true` while keyboard focus is on, or inside, `[data-site-header]`. The
   * scroll-header guard uses it so a focused bar never slides away under the
   * user. `false` without a DOM, an active element or a header.
   */
  isHeaderFocusWithin(): boolean;
  /**
   * Stop focus inside the sticky header from moving the page. Chrome scrolls
   * a focused sticky descendant toward its static (off-screen) position, so
   * this listener restores the pre-focus scroll offset on the next frame.
   * It ignores an inert/hidden header (nothing there can hold focus). Returns
   * an unsubscribe.
   */
  keepHeaderFocusStable(): () => void;
  /**
   * Apply a locale to the document root: sets `<html lang>` to its BCP-47 tag
   * (`langAttr`) and mirrors the code into `document.documentElement.dataset.locale`
   * (the `data-locale` attribute) so the CSS locale toggle can reveal the
   * matching `[data-l]` spans. Never throws.
   */
  applyLocale(locale: Locale): void;
  /**
   * Toggle the `hidden` attribute on every element matching `selector`. The
   * consent gate uses it to reveal the server-rendered third-party embed layer
   * (which ships `hidden`) and to put it back when the provider fails, so the
   * component never touches `document` itself. Never throws.
   */
  setHidden(selector: string, hidden: boolean): void;
  /**
   * Append one `<script src>` and resolve `true` once it loads, `false` when
   * the platform lacks a DOM, the tag cannot be created, or the request
   * errors (the failed tag is removed so a retry injects a fresh one).
   * `options.id` dedupes: a call that finds a loaded tag with that id resolves
   * `true` without appending a duplicate. Never rejects.
   */
  loadScript(src: string, options?: DomScriptOptions): Promise<boolean>;
  /**
   * Run `frame` once per animation frame until the returned stop function is
   * called; `frame` receives the rAF timestamp. This is the ONE shared animation
   * loop: the atmosphere's star dust, shooting stars and lightning all drive
   * through a single subscription rather than each starting its own. The stop
   * function is idempotent. Never throws; without a `requestAnimationFrame` it
   * returns a no-op stop.
   */
  startLoop(frame: (time: number) => void): () => void;
  /**
   * Subscribe to document visibility: `callback` receives `true` while the tab
   * is hidden and `false` once it is visible again. It is invoked once
   * immediately with the current state so a caller can decide whether to start.
   * Returns an unsubscribe. Never throws.
   */
  onVisibilityChange(callback: (hidden: boolean) => void): () => void;
  /**
   * Create an `IntersectionObserver` for an entrance reveal, or `null` when the
   * platform lacks the API (callers then leave their elements in the
   * already-visible default). Never throws.
   */
  createIntersectionObserver(
    callback: (entries: DomIntersectionEntry[]) => void,
    options?: DomIntersectionOptions,
  ): DomIntersectionObserver | null;
}

function createDomAdapter(): DomPort {
  return {
    onScroll(callback) {
      if (typeof window === "undefined") return () => {};

      let frame: number | null = null;
      const handleScroll = () => {
        if (frame !== null) return;
        frame = window.requestAnimationFrame(() => {
          frame = null;
          callback(window.scrollY);
        });
      };

      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
      };
    },

    onHashChange(callback) {
      if (typeof window === "undefined") return () => {};

      const handleHashChange = () => {
        callback(window.location?.hash ?? "");
      };

      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    },

    prefersReducedMotion() {
      try {
        if (
          typeof window === "undefined" ||
          typeof window.matchMedia !== "function"
        ) {
          return false;
        }
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {
        return false;
      }
    },

    setHeaderHidden(hidden) {
      try {
        if (typeof document === "undefined") return;
        const header = document.querySelector("[data-site-header]");
        if (!header) return;
        if (hidden) {
          header.setAttribute("data-hidden", "");
          header.setAttribute("inert", "");
        } else {
          header.removeAttribute("data-hidden");
          header.removeAttribute("inert");
        }
      } catch {
        // Best-effort: header visibility must never break the caller.
      }
    },

    isHeaderFocusWithin() {
      try {
        if (typeof document === "undefined") return false;
        const header = document.querySelector("[data-site-header]");
        const active = document.activeElement;
        return Boolean(header && active && header.contains(active));
      } catch {
        return false;
      }
    },

    keepHeaderFocusStable() {
      try {
        if (typeof document === "undefined") return () => {};
        if (typeof window === "undefined") return () => {};

        let restoreFrame: number | null = null;

        const cancelRestore = () => {
          if (restoreFrame === null) return;
          try {
            window.cancelAnimationFrame?.(restoreFrame);
          } catch {
            // Best-effort: the frame may already have run.
          }
          restoreFrame = null;
        };

        /*
         * A fragment link inside the header is intentional navigation, not the
         * "focus dragged the sticky bar's static position into view" case this
         * guard exists for. Both activation (click/Enter) and any hash change
         * that lands before the restore frame win over the restore.
         */
        const isSamePageFragment = (node: EventTarget | null): boolean => {
          try {
            const anchor = (node as HTMLElement | null)?.closest?.(
              "a[href]",
            ) as HTMLAnchorElement | null;
            const href = anchor?.getAttribute("href");
            if (!href) return false;
            if (href.startsWith("#")) return true;
            const location = window.location;
            if (!location) return false;
            const url = new URL(href, location.href);
            return (
              Boolean(url.hash) &&
              url.origin === location.origin &&
              url.pathname === location.pathname &&
              url.search === location.search
            );
          } catch {
            return false;
          }
        };

        const handleFocusIn = (event: FocusEvent) => {
          try {
            const header = document.querySelector("[data-site-header]");
            if (
              !header ||
              header.hasAttribute("inert") ||
              !header.contains(event.target as Node)
            ) {
              return;
            }
            cancelRestore();
            const x = window.scrollX;
            const y = window.scrollY;
            const startHash = window.location?.hash ?? "";
            restoreFrame = window.requestAnimationFrame(() => {
              restoreFrame = null;
              // A same-page fragment navigation already moved the viewport;
              // restoring here would cancel it.
              if ((window.location?.hash ?? "") !== startHash) return;
              window.scrollTo(x, y);
            });
          } catch {
            // Best-effort: focus stability must never break the event.
          }
        };

        const handleActivation = (event: Event) => {
          try {
            if (event.type === "keydown") {
              if ((event as KeyboardEvent).key !== "Enter") return;
              if (!isSamePageFragment(document.activeElement)) return;
            } else if (!isSamePageFragment(event.target)) {
              return;
            }
            cancelRestore();
          } catch {
            // Best-effort: activation must never throw.
          }
        };

        document.addEventListener("focusin", handleFocusIn, true);
        document.addEventListener("click", handleActivation, true);
        document.addEventListener("keydown", handleActivation, true);
        return () => {
          cancelRestore();
          document.removeEventListener("focusin", handleFocusIn, true);
          document.removeEventListener("click", handleActivation, true);
          document.removeEventListener("keydown", handleActivation, true);
        };
      } catch {
        return () => {};
      }
    },

    applyLocale(locale) {
      try {
        if (typeof document === "undefined") return;
        const root = document.documentElement;
        if (!root) return;
        root.lang = langAttr[locale];
        root.dataset.locale = locale;
      } catch {
        // Best-effort: a failing/passive DOM must never break the caller.
      }
    },

    setHidden(selector, hidden) {
      try {
        if (typeof document === "undefined") return;
        for (const element of document.querySelectorAll(selector)) {
          element.toggleAttribute("hidden", hidden);
        }
      } catch {
        // Best-effort: visibility toggling must never break the caller.
      }
    },

    loadScript(src, options = {}) {
      if (typeof document === "undefined") return Promise.resolve(false);

      try {
        if (options.id) {
          const existing = document.getElementById(options.id);
          if (existing) return Promise.resolve(true);
        }

        const script = document.createElement("script");
        if (options.id) script.id = options.id;
        script.src = src;
        script.async = options.async ?? true;

        return new Promise<boolean>((resolve) => {
          script.addEventListener("load", () => resolve(true), { once: true });
          script.addEventListener(
            "error",
            () => {
              try {
                script.remove();
              } catch {
                // A detached/immutable tag still counts as a failed load.
              }
              resolve(false);
            },
            { once: true },
          );

          const parent = document.head ?? document.body;
          if (!parent) {
            resolve(false);
            return;
          }

          try {
            parent.appendChild(script);
          } catch {
            resolve(false);
          }
        });
      } catch {
        return Promise.resolve(false);
      }
    },

    startLoop(frame) {
      if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
      ) {
        return () => {};
      }

      let rafId: number | null = null;
      let stopped = false;

      const tick = (time: number) => {
        rafId = null;
        if (stopped) return;
        frame(time);
        if (!stopped) rafId = window.requestAnimationFrame(tick);
      };

      try {
        rafId = window.requestAnimationFrame(tick);
      } catch {
        return () => {};
      }

      return () => {
        stopped = true;
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      };
    },

    onVisibilityChange(callback) {
      try {
        if (typeof document === "undefined") return () => {};
        const handler = () => callback(document.hidden);
        document.addEventListener("visibilitychange", handler);
        handler();
        return () => document.removeEventListener("visibilitychange", handler);
      } catch {
        return () => {};
      }
    },

    createIntersectionObserver(callback, options) {
      try {
        if (typeof IntersectionObserver !== "function") return null;
        const observer = new IntersectionObserver(
          (entries) =>
            callback(
              entries.map((entry) => ({
                target: entry.target,
                isIntersecting: entry.isIntersecting,
              })),
            ),
          options,
        );
        return {
          observe: (target) => observer.observe(target),
          unobserve: (target) => observer.unobserve(target),
          disconnect: () => observer.disconnect(),
        };
      } catch {
        return null;
      }
    },
  };
}

/** Shared real adapter. */
export const domAdapter: DomPort = createDomAdapter();

/** Deterministic no-op test double: observes nothing, mutates nothing. */
export const noopDomAdapter: DomPort = {
  onScroll: () => () => {},
  onHashChange: () => () => {},
  prefersReducedMotion: () => false,
  setHeaderHidden: () => {},
  isHeaderFocusWithin: () => false,
  keepHeaderFocusStable: () => () => {},
  applyLocale: () => {},
  setHidden: () => {},
  loadScript: () => Promise.resolve(false),
  startLoop: () => () => {},
  onVisibilityChange: () => () => {},
  createIntersectionObserver: () => null,
};
