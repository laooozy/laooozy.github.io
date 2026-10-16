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

  return deps.adapters.dom.onScroll((scrollY) => {
    if (deps.adapters.dom.prefersReducedMotion()) {
      lastScrollY = scrollY;
      apply(false);
      return;
    }

    const hidden = resolveHeaderHidden(
      {
        scrollY,
        lastScrollY,
        hidden: deps.store.getState().headerHidden,
      },
      NEAR_TOP_PX,
    );
    lastScrollY = scrollY;
    apply(hidden);
  });
}
