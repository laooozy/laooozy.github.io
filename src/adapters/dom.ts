/**
 * DOM adapter — a port over the browser side effects the shell needs: scroll
 * observation, reduced-motion preference, header visibility, locale application
 * and the animation primitives the background atmosphere and the entrance
 * reveal consume (a shared `requestAnimationFrame` loop, a document-visibility
 * subscription and an `IntersectionObserver` factory).
 *
 * Every method is total (never throws): a missing/failing DOM degrades to a
 * no-op. Callers inject the port, so the store/hook layer owns the behaviour
 * while this module owns the imperative glue. Only PRIMITIVES live here — the
 * canvas drawing and the reveal logic belong to the client modules that consume
 * this surface, not to the port.
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

/** Browser side effects for scroll + header concerns. */
export interface DomPort {
  /**
   * Observe scrolling. `callback` receives the current `window.scrollY`, rAF
   * coalesced so at most one call happens per animation frame and the listener
   * itself stays passive. Returns an unsubscribe that also cancels a pending
   * frame.
   */
  onScroll(callback: (scrollY: number) => void): () => void;
  /** `true` when the user asked for reduced motion. `false` when unknown. */
  prefersReducedMotion(): boolean;
  /** Toggle the `data-hidden` attribute on `[data-site-header]`. */
  setHeaderHidden(hidden: boolean): void;
  /**
   * Apply a locale to the document root: sets `<html lang>` to its BCP-47 tag
   * (`langAttr`) and mirrors the code into `document.documentElement.dataset.locale`
   * (the `data-locale` attribute) so the CSS locale toggle can reveal the
   * matching `[data-l]` spans. Never throws.
   */
  applyLocale(locale: Locale): void;
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
        if (hidden) header.setAttribute("data-hidden", "");
        else header.removeAttribute("data-hidden");
      } catch {
        // Best-effort: header visibility must never break the caller.
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
  prefersReducedMotion: () => false,
  setHeaderHidden: () => {},
  applyLocale: () => {},
  startLoop: () => () => {},
  onVisibilityChange: () => () => {},
  createIntersectionObserver: () => null,
};
