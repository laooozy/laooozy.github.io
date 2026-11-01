/**
 * Motion primitives: the reduced-motion preference, the ONE shared animation
 * loop and the document-visibility subscription.
 *
 * `startLoop` is the single `requestAnimationFrame` loop in the whole app. The
 * atmosphere's star dust, shooting stars and lightning all drive through it; no
 * client module may start a second loop. Without a DOM the loop degrades to a
 * no-op stop.
 */

import type { DomMotionPort } from "./types";

/** `true` when the user asked for reduced motion. `false` when unknown. */
export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

/** Build the motion slice of the DOM port. */
export function createMotionAdapter(): DomMotionPort {
  return {
    prefersReducedMotion,

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
  };
}
