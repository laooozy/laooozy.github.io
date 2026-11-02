/**
 * Third-party script injection and consent-gated provider markup.
 *
 * One `<script src>` at a time, deduped by `options.id`, resolving `true` on
 * load and `false` on a missing DOM, append failure, error or timeout. A
 * failed or timed-out tag is removed so a retry injects a fresh one. Provider
 * HTML stays in an inert `<template>` until `materializeTemplate` clones it
 * into the live target after consent. Never rejects.
 */

import type { DomScriptsPort } from "./types";

/** How long `loadScript` waits for `load`/`error` before giving up. */
export const DEFAULT_SCRIPT_TIMEOUT_MS = 10_000;

/** Treat a non-positive or non-finite override as the documented default. */
function resolveTimeoutMs(timeoutMs: number | undefined): number {
  return typeof timeoutMs === "number" &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
    ? timeoutMs
    : DEFAULT_SCRIPT_TIMEOUT_MS;
}

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
          let settled = false;
          let timer: ReturnType<typeof setTimeout> | undefined;

          const cleanup = () => {
            if (timer !== undefined) {
              clearTimeout(timer);
              timer = undefined;
            }
          };

          function finish(value: boolean, remove: boolean) {
            if (settled) return;
            settled = true;
            cleanup();
            if (remove) {
              try {
                script.remove();
              } catch {
                // A detached/immutable tag still counts as a failed load.
              }
            }
            resolve(value);
          }

          function onLoad() {
            finish(true, false);
          }

          function onError() {
            finish(false, true);
          }

          script.addEventListener("load", onLoad, { once: true });
          script.addEventListener("error", onError, { once: true });

          const parent = document.head ?? document.body;
          if (!parent) {
            finish(false, true);
            return;
          }

          timer = setTimeout(
            () => finish(false, true),
            resolveTimeoutMs(options.timeoutMs),
          );

          try {
            parent.appendChild(script);
          } catch {
            finish(false, true);
          }
        });
      } catch {
        return Promise.resolve(false);
      }
    },

    materializeTemplate(templateSelector, targetSelector) {
      try {
        if (typeof document === "undefined") return false;
        const template = document.querySelector(templateSelector);
        const target = document.querySelector(targetSelector);
        const content = (template as HTMLTemplateElement | null)?.content;
        if (!template || !target || !content) return false;

        target.replaceChildren(content.cloneNode(true));
        return true;
      } catch {
        return false;
      }
    },

    clearElement(selector) {
      try {
        if (typeof document === "undefined") return;
        document.querySelector(selector)?.replaceChildren();
      } catch {
        // Best-effort: clearing a failed layer must never break the caller.
      }
    },
  };
}
