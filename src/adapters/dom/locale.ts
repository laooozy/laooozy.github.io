/**
 * Locale application (the `<html lang>` / `data-locale` pair the CSS toggle
 * reads) and the generic `hidden` attribute toggle the Instagram gate uses.
 */

import { langAttr } from "@/i18n";

import type { DomLocalePort } from "./types";

/** Build the locale slice of the DOM port. */
export function createLocaleAdapter(): DomLocalePort {
  return {
    applyLocale(locale) {
      try {
        if (typeof document === "undefined") return;
        const root = document.documentElement;
        if (!root) return;
        root.lang = langAttr[locale];
        root.dataset.locale = locale;
      } catch {
        // Best-effort: a failing/passive DOM must never break the caller.
      }
    },

    setHidden(selector, hidden) {
      try {
        if (typeof document === "undefined") return;
        for (const element of document.querySelectorAll(selector)) {
          element.toggleAttribute("hidden", hidden);
        }
      } catch {
        // Best-effort: visibility toggling must never break the caller.
      }
    },
  };
}
