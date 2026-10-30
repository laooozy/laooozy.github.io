/**
 * Vanilla scroll-header wiring.
 *
 * The shell needs the top bar to hide on scroll-down / reveal on scroll-up
 * WITHOUT pulling in a React island. This module is the imperative bridge: it
 * subscribes to the injected DOM port, makes the pure `resolveHeaderHidden`
 * decision, and applies the result both to the store and to the DOM adapter.
 * No browser globals and no React — everything arrives through `ClientDeps`,
 * so this is the same wiring the `useScrollHeader` hook runs, minus the hook.
 *
 * `attachScrollHeader` returns the unsubscribe so an island or a page script
 * can tear the subscription down; in the static layout it simply lives for the
 * lifetime of the document.
 */

import type { ClientDeps } from "@/hooks/deps";
import { NEAR_TOP_PX, resolveHeaderHidden } from "@/hooks/useScrollHeader";

/**
 * Subscribe to scroll frames and drive header visibility through the injected
 * deps. Reduced motion always keeps the bar visible. Returns the unsubscribe.
 */
export function attachScrollHeader(deps: ClientDeps): () => void {
  let lastScrollY = 0;

  const apply = (hidden: boolean): void => {
    deps.store.getState().setHeaderHidden(hidden);
    deps.adapters.dom.setHeaderHidden(hidden);
  };

  // A sticky header's focused links would otherwise drag the page toward the
  // header's static position; this keeps the scroll offset where the user
  // left it.
  const stopFocusStability = deps.adapters.dom.keepHeaderFocusStable();

  const stopScroll = deps.adapters.dom.onScroll((scrollY) => {
    if (deps.adapters.dom.prefersReducedMotion()) {
      lastScrollY = scrollY;
      apply(false);
      return;
    }

    const state = deps.store.getState();
    /*
     * The bar never hides while the user is using it: the open mobile panel
     * (store flag, kept in sync by SiteHeader) or focus anywhere inside it
     * (read through the port, never `document.activeElement` here). Because
     * those guards prevent hiding, an open menu/language popover can never be
     * left translated off-screen — no separate close-on-hide is reachable.
     */
    const hidden = resolveHeaderHidden(
      {
        scrollY,
        lastScrollY,
        hidden: state.headerHidden,
      },
      NEAR_TOP_PX,
      {
        menuOpen: state.headerMenuOpen,
        focusWithinHeader: deps.adapters.dom.isHeaderFocusWithin(),
      },
    );
    lastScrollY = scrollY;
    apply(hidden);
  });

  return () => {
    stopScroll();
    stopFocusStability();
  };
}
