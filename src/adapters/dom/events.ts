/**
 * Global event seams, body scroll locking and platform detection.
 *
 * These are the only document-level subscriptions a component may request
 * without touching `document` itself. `setBodyScrollLocked` owns a single saved
 * inline `overflow` value so locking is idempotent and unlocking restores the
 * pre-lock state (including "no inline override") rather than clearing whatever
 * was there.
 */

import type { DomEventsPort } from "./types";

/** `true` on Apple platforms, read lazily from `navigator`. Never throws. */
function isApplePlatform(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    const platform =
      typeof navigator.platform === "string" ? navigator.platform : "";
    const userAgent =
      typeof navigator.userAgent === "string" ? navigator.userAgent : "";
    return (
      /mac|iphone|ipad|ipod/i.test(platform) ||
      /mac os x|iphone|ipad|ipod/i.test(userAgent)
    );
  } catch {
    return false;
  }
}

/** Build the events slice of the DOM port. */
export function createEventsAdapter(): DomEventsPort {
  /*
   * The inline `overflow` the body carried before this port locked scrolling.
   * `null` means "not locked by us"; the empty string is a real remembered
   * value (no inline override) and is restored as such.
   */
  let savedOverflow: string | null = null;

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

    onPointerDown(callback) {
      try {
        if (typeof document === "undefined") return () => {};
        const handler = (event: PointerEvent) => callback(event);
        document.addEventListener("pointerdown", handler);
        return () => document.removeEventListener("pointerdown", handler);
      } catch {
        return () => {};
      }
    },

    setBodyScrollLocked(locked) {
      try {
        if (typeof document === "undefined") return;
        const body = document.body;
        if (!body) return;

        if (locked) {
          // Idempotent: re-assert `hidden` but keep the value the FIRST lock
          // captured, so a repeated lock never loses the pre-lock override.
          if (savedOverflow === null) savedOverflow = body.style.overflow;
          body.style.overflow = "hidden";
          return;
        }

        // Only restore what this port locked; never clobber another writer.
        if (savedOverflow === null) return;
        body.style.overflow = savedOverflow;
        savedOverflow = null;
      } catch {
        // Best-effort: scroll locking must never break the caller.
      }
    },

    isApplePlatform,
  };
}
