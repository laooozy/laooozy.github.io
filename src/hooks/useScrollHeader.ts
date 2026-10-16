/**
 * Scroll-header hook — observes scrolling through the injected DOM port and
 * drives header visibility from the store.
 *
 * Rule: hide when scrolling DOWN and not near the top; reveal on ANY upward
 * movement, when back near the top, and when the user prefers reduced motion.
 * The pure `resolveHeaderHidden` decision is exported for direct testing.
 * The scroll subscription is cleaned up on unmount.
 */

import { useEffect } from "react";

import type { ClientDeps } from "./deps";

/** Within this many pixels of the top the header is always revealed. */
export const NEAR_TOP_PX = 8;

/** A scroll sample, paired with the previous frame's position and visibility. */
export interface ScrollSample {
  scrollY: number;
  lastScrollY: number;
  hidden: boolean;
}

/**
 * Pure header-visibility decision for one scroll frame. Near the top OR any
 * upward movement reveals (`false`); otherwise a downward move hides (`true`).
 * A no-op frame keeps the current visibility.
 */
export function resolveHeaderHidden(
  sample: ScrollSample,
  nearTopPx: number = NEAR_TOP_PX,
): boolean {
  if (sample.scrollY <= nearTopPx) return false;
  if (sample.scrollY > sample.lastScrollY) return true;
  if (sample.scrollY < sample.lastScrollY) return false;
  return sample.hidden;
}

export function useScrollHeader(deps: ClientDeps): void {
  useEffect(() => {
    let lastScrollY = 0;

    const apply = (hidden: boolean): void => {
      deps.store.getState().setHeaderHidden(hidden);
      deps.adapters.dom.setHeaderHidden(hidden);
    };

    const unsubscribe = deps.adapters.dom.onScroll((scrollY) => {
      if (deps.adapters.dom.prefersReducedMotion()) {
        lastScrollY = scrollY;
        apply(false);
        return;
      }
      const hidden = resolveHeaderHidden({
        scrollY,
        lastScrollY,
        hidden: deps.store.getState().headerHidden,
      });
      lastScrollY = scrollY;
      apply(hidden);
    });

    return unsubscribe;
  }, [deps]);
}
