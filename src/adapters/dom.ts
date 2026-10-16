/**
 * DOM adapter — a port over the browser side effects the shell needs: scroll
 * observation, reduced-motion preference and header visibility.
 *
 * Every method is total (never throws): a missing/failing DOM degrades to a
 * no-op. Callers inject the port, so the store/hook layer owns the behaviour
 * while this module owns the imperative glue.
 */

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
  };
}

/** Shared real adapter. */
export const domAdapter: DomPort = createDomAdapter();

/** Deterministic no-op test double: observes nothing, mutates nothing. */
export const noopDomAdapter: DomPort = {
  onScroll: () => () => {},
  prefersReducedMotion: () => false,
  setHeaderHidden: () => {},
};
