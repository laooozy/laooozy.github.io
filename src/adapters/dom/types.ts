/**
 * Contract types for the DOM port.
 *
 * The port is split into cohesive slices (scroll, motion, focus, locale,
 * scripts, events) so each implementation module owns one concern while
 * consumers keep seeing the single aggregate `DomPort`. Every method is total
 * (never throws): a missing/failing DOM degrades to a no-op / `false` / `""`.
 */

import type { Locale } from "@/i18n";

/** Options for `DomScriptsPort.loadScript`. */
export interface DomScriptOptions {
  /**
   * Stable element id used for dedupe: a second call that finds a tag with
   * this id resolves as already loaded instead of appending a duplicate.
   */
  id?: string;
  /** Set the tag's `async` flag; defaults to `true`. */
  async?: boolean;
  /**
   * How long to wait for `load`/`error` before giving up, in milliseconds.
   * Defaults to `DEFAULT_SCRIPT_TIMEOUT_MS`; non-positive or non-finite
   * overrides also resolve to that default.
   */
  timeoutMs?: number;
}

/** Scroll observation and scroll-position controls. */
export interface DomScrollPort {
  /**
   * Observe scrolling. `callback` receives the current `window.scrollY`, rAF
   * coalesced so at most one call happens per animation frame and the listener
   * itself stays passive. Returns an unsubscribe that also cancels a pending
   * frame.
   */
  onScroll(callback: (scrollY: number) => void): () => void;
  /** Current vertical scroll offset in CSS pixels. `0` without a DOM. */
  scrollY(): number;
  /**
   * Scroll to the very top. Smooth unless the user prefers reduced motion,
   * in which case it jumps instantly. Never throws.
   */
  scrollToTop(): void;
}

/** Reduced-motion preference, the shared animation loop and tab visibility. */
export interface DomMotionPort {
  /** `true` when the user asked for reduced motion. `false` when unknown. */
  prefersReducedMotion(): boolean;
  /**
   * Run `frame` once per animation frame until the returned stop function is
   * called; `frame` receives the rAF timestamp. This is the ONE shared animation
   * loop: the atmosphere's star dust, shooting stars and lightning all drive
   * through a single subscription rather than each starting its own. The stop
   * function is idempotent. Never throws; without a `requestAnimationFrame` it
   * returns a no-op stop.
   */
  startLoop(frame: (time: number) => void): () => void;
  /**
   * Subscribe to document visibility: `callback` receives `true` while the tab
   * is hidden and `false` once it is visible again. It is invoked once
   * immediately with the current state so a caller can decide whether to start.
   * Returns an unsubscribe. Never throws.
   */
  onVisibilityChange(callback: (hidden: boolean) => void): () => void;
}

/** Sticky-header hide/show state and focus-stability helpers. */
export interface DomFocusPort {
  /**
   * Toggle the header's hidden state: the `data-hidden` attribute (the
   * off-screen transform) and `inert` (so a hidden bar's links/buttons leave
   * the tab order and the accessibility tree). Both are removed when shown.
   */
  setHeaderHidden(hidden: boolean): void;
  /**
   * `true` while keyboard focus is on, or inside, `[data-site-header]`. The
   * scroll-header guard keeps a focused bar from sliding away under the user.
   * `false` without a DOM, an active element or a header.
   */
  isHeaderFocusWithin(): boolean;
  /**
   * Stop focus inside the sticky header from moving the page. Chrome scrolls
   * a focused sticky descendant toward its static (off-screen) position, so
   * this listener restores the pre-focus scroll offset on the next frame.
   * It ignores an inert/hidden header (nothing there can hold focus). Returns
   * an unsubscribe.
   */
  keepHeaderFocusStable(): () => void;
}

/** Locale application and generic visibility toggling. */
export interface DomLocalePort {
  /**
   * Apply a locale to the document root: sets `<html lang>` to its BCP-47 tag
   * (`langAttr`) and mirrors the code into `document.documentElement.dataset.locale`
   * (the `data-locale` attribute) so the CSS locale toggle can reveal the
   * matching `[data-l]` spans. Never throws.
   */
  applyLocale(locale: Locale): void;
  /**
   * Toggle the `hidden` attribute on every element matching `selector`. The
   * consent gate uses it to reveal the server-rendered third-party embed layer
   * (which ships `hidden`) and to put it back when the provider fails, so the
   * component never touches `document` itself. Never throws.
   */
  setHidden(selector: string, hidden: boolean): void;
}

/** Third-party script injection and consent-gated provider markup. */
export interface DomScriptsPort {
  /**
   * Append one `<script src>` and resolve `true` once it loads, `false` when
   * the platform lacks a DOM, the tag cannot be created, the request errors or
   * it stalls past `options.timeoutMs` (the failed/timed-out tag is removed so
   * a retry can inject a fresh one). `options.id` dedupes: a call that finds a
   * loaded tag with that id resolves `true` without appending a duplicate.
   * Never rejects.
   */
  loadScript(src: string, options?: DomScriptOptions): Promise<boolean>;
  /**
   * Clone the inert content of the `<template>` matching `templateSelector`
   * into the element matching `targetSelector`, replacing its children.
   * Template content is outside the document tree, so nothing inside it is
   * fetched or executed before this call. Returns `false` (and mutates
   * nothing) when either element or the template content is missing. Never
   * throws.
   */
  materializeTemplate(
    templateSelector: string,
    targetSelector: string,
  ): boolean;
  /**
   * Remove every child of the first element matching `selector`, leaving the
   * element (and any inert template) intact for a retry. Never throws.
   */
  clearElement(selector: string): void;
}

/** Global event seams. */
export interface DomEventsPort {
  /**
   * Observe same-document hash changes (`hashchange`). The callback receives
   * the new `location.hash`, including the leading `#`, or `""` when cleared.
   * The disclosure uses it to close on an anchor jump that does not change the
   * pathname. Returns an unsubscribe. Never throws.
   */
  onHashChange(callback: (hash: string) => void): () => void;
  /**
   * Observe global `keydown` presses on the document. The injection seam the
   * search palette uses for its `⌘K` / `Ctrl+K` shortcut, so components never
   * touch `document` themselves. Returns an unsubscribe. Never throws.
   */
  onKeyDown(callback: (event: KeyboardEvent) => void): () => void;
}

/** Every browser-effect primitive the shell injects. */
export interface DomPort
  extends
    DomScrollPort,
    DomMotionPort,
    DomFocusPort,
    DomLocalePort,
    DomScriptsPort,
    DomEventsPort {}
