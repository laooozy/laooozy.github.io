/**
 * Global event seams.
 *
 * These are the only document-level subscriptions a component may request
 * without touching `document` itself.
 */

import type { DomEventsPort } from "./types";

/** Build the events slice of the DOM port. */
export function createEventsAdapter(): DomEventsPort {
  return {
    onHashChange(callback) {
      if (typeof window === "undefined") return () => {};

      const handleHashChange = () => {
        callback(window.location?.hash ?? "");
      };

      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    },

    onKeyDown(callback) {
      try {
        if (typeof document === "undefined") return () => {};
        const handler = (event: KeyboardEvent) => callback(event);
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
      } catch {
        return () => {};
      }
    },
  };
}
