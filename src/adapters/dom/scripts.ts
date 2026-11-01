/**
 * Third-party script injection.
 *
 * One `<script src>` at a time, deduped by `options.id`, resolving `true` on
 * load and `false` (after removing the failed tag, so a retry injects a fresh
 * one) on error. Never rejects.
 */

import type { DomScriptsPort } from "./types";

/** Build the script-injection slice of the DOM port. */
export function createScriptsAdapter(): DomScriptsPort {
  return {
    loadScript(src, options = {}) {
      if (typeof document === "undefined") return Promise.resolve(false);

      try {
        if (options.id) {
          const existing = document.getElementById(options.id);
          if (existing) return Promise.resolve(true);
        }

        const script = document.createElement("script");
        if (options.id) script.id = options.id;
        script.src = src;
        script.async = options.async ?? true;

        return new Promise<boolean>((resolve) => {
          script.addEventListener("load", () => resolve(true), { once: true });
          script.addEventListener(
            "error",
            () => {
              try {
                script.remove();
              } catch {
                // A detached/immutable tag still counts as a failed load.
              }
              resolve(false);
            },
            { once: true },
          );

          const parent = document.head ?? document.body;
          if (!parent) {
            resolve(false);
            return;
          }

          try {
            parent.appendChild(script);
          } catch {
            resolve(false);
          }
        });
      } catch {
        return Promise.resolve(false);
      }
    },
  };
}
