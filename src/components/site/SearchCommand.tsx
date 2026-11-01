/**
 * SearchCommand — the always-mounted half of the global `⌘K` search palette.
 *
 * Two responsibilities:
 *  1. React to the shared store's `search.open` flag (the header trigger and the
 *     keyboard shortcut both call `openSearch()`), and
 *  2. lazy-load the actual dialog chunk the FIRST time it opens, so `cmdk`,
 *     Base UI Dialog and the Pagefind wiring never enter the initial bundle.
 *
 * It renders nothing until the palette has been opened at least once. That is
 * deliberate: this island is a sibling of `SiteHeader` in `BaseLayout`, not a
 * child of it, so the header keeps its own hydration island and the dialog can
 * be deferred independently.
 *
 * The global shortcut listener touches `document` directly for now. Task 38
 * moves it behind `DomPort.onKeyDown`; it is isolated in this effect so the
 * migration is a one-line swap.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";

/** Dialog + cmdk + Pagefind client wiring, split into its own async chunk. */
const SearchCommandDialog = lazy(() => import("./SearchCommandDialog"));

export default function SearchCommand() {
  const deps = useClientDeps();
  const open = useStore(deps.store, (state) => state.search.open);
  const [activated, setActivated] = useState(false);

  // Load the dialog chunk on the first open, then keep it for later opens.
  useEffect(() => {
    if (open) setActivated(true);
  }, [open]);

  // ⌘K (macOS) / Ctrl+K (elsewhere) opens the palette from anywhere.
  // Task 38 replaces this with the injected DomPort keyboard seam.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        deps.store.getState().openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deps]);

  if (!activated) return null;

  return (
    <Suspense fallback={null}>
      <SearchCommandDialog open={open} />
    </Suspense>
  );
}
