/**
 * Sticky-header focus port: hide/show state, the "is focus inside the header"
 * probe and the guard that stops a focused sticky descendant from dragging the
 * page toward the bar's static position.
 */

import type { DomFocusPort } from "./types";

/** Build the header-focus slice of the DOM port. */
export function createFocusAdapter(): DomFocusPort {
  return {
    setHeaderHidden(hidden) {
      try {
        if (typeof document === "undefined") return;
        const header = document.querySelector("[data-site-header]");
        if (!header) return;
        if (hidden) {
          header.setAttribute("data-hidden", "");
          header.setAttribute("inert", "");
        } else {
          header.removeAttribute("data-hidden");
          header.removeAttribute("inert");
        }
      } catch {
        // Best-effort: header visibility must never break the caller.
      }
    },

    isHeaderFocusWithin() {
      try {
        if (typeof document === "undefined") return false;
        const header = document.querySelector("[data-site-header]");
        const active = document.activeElement;
        return Boolean(header && active && header.contains(active));
      } catch {
        return false;
      }
    },

    keepHeaderFocusStable() {
      try {
        if (typeof document === "undefined") return () => {};
        if (typeof window === "undefined") return () => {};

        let restoreFrame: number | null = null;

        const cancelRestore = () => {
          if (restoreFrame === null) return;
          try {
            window.cancelAnimationFrame?.(restoreFrame);
          } catch {
            // Best-effort: the frame may already have run.
          }
          restoreFrame = null;
        };

        /*
         * A fragment link inside the header is intentional navigation, not the
         * "focus dragged the sticky bar's static position into view" case this
         * guard exists for. Both activation (click/Enter) and any hash change
         * that lands before the restore frame win over the restore.
         */
        const isSamePageFragment = (node: EventTarget | null): boolean => {
          try {
            const anchor = (node as HTMLElement | null)?.closest?.(
              "a[href]",
            ) as HTMLAnchorElement | null;
            const href = anchor?.getAttribute("href");
            if (!href) return false;
            if (href.startsWith("#")) return true;
            const location = window.location;
            if (!location) return false;
            const url = new URL(href, location.href);
            return (
              Boolean(url.hash) &&
              url.origin === location.origin &&
              url.pathname === location.pathname &&
              url.search === location.search
            );
          } catch {
            return false;
          }
        };

        const handleFocusIn = (event: FocusEvent) => {
          try {
            const header = document.querySelector("[data-site-header]");
            if (
              !header ||
              header.hasAttribute("inert") ||
              !header.contains(event.target as Node)
            ) {
              return;
            }
            cancelRestore();
            const x = window.scrollX;
            const y = window.scrollY;
            const startHash = window.location?.hash ?? "";
            restoreFrame = window.requestAnimationFrame(() => {
              restoreFrame = null;
              // A same-page fragment navigation already moved the viewport;
              // restoring here would cancel it.
              if ((window.location?.hash ?? "") !== startHash) return;
              window.scrollTo(x, y);
            });
          } catch {
            // Best-effort: focus stability must never break the event.
          }
        };

        const handleActivation = (event: Event) => {
          try {
            if (event.type === "keydown") {
              if ((event as KeyboardEvent).key !== "Enter") return;
              if (!isSamePageFragment(document.activeElement)) return;
            } else if (!isSamePageFragment(event.target)) {
              return;
            }
            cancelRestore();
          } catch {
            // Best-effort: activation must never throw.
          }
        };

        document.addEventListener("focusin", handleFocusIn, true);
        document.addEventListener("click", handleActivation, true);
        document.addEventListener("keydown", handleActivation, true);
        return () => {
          cancelRestore();
          document.removeEventListener("focusin", handleFocusIn, true);
          document.removeEventListener("click", handleActivation, true);
          document.removeEventListener("keydown", handleActivation, true);
        };
      } catch {
        return () => {};
      }
    },
  };
}
