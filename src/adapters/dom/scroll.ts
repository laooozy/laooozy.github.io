/**
 * Scroll observation and scroll-position controls.
 *
 * `onScroll` coalesces native scroll events onto one `requestAnimationFrame`
 * and its unsubscribe cancels a pending frame. Every read guards the missing
 * DOM and returns `0`; every write is best-effort.
 */

import { prefersReducedMotion } from "./motion";
import type { DomScrollPort } from "./types";

/** Build the scroll slice of the DOM port. */
export function createScrollAdapter(): DomScrollPort {
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

    scrollY() {
      try {
        if (typeof window === "undefined") return 0;
        return window.scrollY;
      } catch {
        return 0;
      }
    },

    scrollToTop() {
      try {
        if (typeof window === "undefined") return;
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      } catch {
        // Best-effort: scrolling must never break the caller.
      }
    },
  };
}
