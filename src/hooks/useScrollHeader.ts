/**
 * Pure scroll-header decision logic, shared by the client scroll wiring
 * (`src/client/scroll-header.ts`) and tested directly.
 *
 * Rule: hide when scrolling DOWN and not near the top; reveal on ANY upward
 * movement, when back near the top, and when the user prefers reduced motion.
 */

/** Within this many pixels of the top the header is always revealed. */
export const NEAR_TOP_PX = 8;

/** A scroll sample, paired with the previous frame's position and visibility. */
export interface ScrollSample {
  scrollY: number;
  lastScrollY: number;
  hidden: boolean;
}

/**
 * Reasons the bar must stay put even while the page scrolls down: the user is
 * using it. Either one forces a reveal.
 */
export interface ScrollHeaderGuard {
  /** The compact disclosure panel is open. */
  menuOpen: boolean;
  /** Keyboard focus is on or inside the header. */
  focusWithinHeader: boolean;
}

/**
 * Pure header-visibility decision for one scroll frame. An active guard (open
 * menu or focus in the header) always reveals; otherwise near the top OR any
 * upward movement reveals (`false`), a downward move hides (`true`), and a
 * no-op frame keeps the current visibility.
 */
export function resolveHeaderHidden(
  sample: ScrollSample,
  nearTopPx: number = NEAR_TOP_PX,
  guard?: ScrollHeaderGuard,
): boolean {
  if (guard?.menuOpen || guard?.focusWithinHeader) return false;
  if (sample.scrollY <= nearTopPx) return false;
  if (sample.scrollY > sample.lastScrollY) return true;
  if (sample.scrollY < sample.lastScrollY) return false;
  return sample.hidden;
}
