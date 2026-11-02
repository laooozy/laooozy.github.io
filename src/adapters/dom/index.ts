/**
 * DOM adapter — the aggregate port over the browser side effects the shell
 * needs: scroll observation, reduced motion, the shared animation loop, header
 * visibility/focus stability, locale application, script injection and the
 * global event seams.
 *
 * Every method is total (never throws): a missing/failing DOM degrades to a
 * no-op. Callers inject the port, so the store/hook layer owns the behaviour
 * while this module owns the imperative glue. Only PRIMITIVES live here — the
 * canvas drawing belongs to the client module that consumes this surface, not
 * to the port.
 *
 * The implementation is split into cohesive slices under this directory
 * (`scroll`, `motion`, `focus`, `locale`, `scripts`, `events`) so each concern
 * stays small and independently testable; `DomPort` remains the one interface
 * every consumer receives.
 */

import { createEventsAdapter } from "./events";
import { createFocusAdapter } from "./focus";
import { createLocaleAdapter } from "./locale";
import { createMotionAdapter } from "./motion";
import { createScriptsAdapter } from "./scripts";
import { createScrollAdapter } from "./scroll";
import type { DomPort } from "./types";

export type {
  DomEventsPort,
  DomFocusPort,
  DomLocalePort,
  DomMotionPort,
  DomPort,
  DomScriptOptions,
  DomScriptsPort,
  DomScrollPort,
} from "./types";
export { DEFAULT_SCRIPT_TIMEOUT_MS } from "./scripts";

/** Build one aggregate DOM adapter from the cohesive slices. */
export function createDomAdapter(): DomPort {
  return {
    ...createScrollAdapter(),
    ...createMotionAdapter(),
    ...createFocusAdapter(),
    ...createLocaleAdapter(),
    ...createScriptsAdapter(),
    ...createEventsAdapter(),
  };
}

/** Shared real adapter. */
export const domAdapter: DomPort = createDomAdapter();

/** Deterministic no-op test double: observes nothing, mutates nothing. */
export const noopDomAdapter: DomPort = {
  onScroll: () => () => {},
  scrollY: () => 0,
  scrollToTop: () => {},
  prefersReducedMotion: () => false,
  startLoop: () => () => {},
  onVisibilityChange: () => () => {},
  setHeaderHidden: () => {},
  isHeaderFocusWithin: () => false,
  keepHeaderFocusStable: () => () => {},
  applyLocale: () => {},
  setHidden: () => {},
  loadScript: () => Promise.resolve(false),
  materializeTemplate: () => false,
  clearElement: () => {},
  onHashChange: () => () => {},
  onKeyDown: () => () => {},
};
