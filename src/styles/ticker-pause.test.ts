/**
 * Regression guard for the "now" ticker pause selectors.
 *
 * The explicit Play button must be able to resume the marquee while that
 * button itself keeps focus or hover — so the pause rules must NOT target the
 * whole `.now-ticker` (`:hover` / `:focus-within`). They must still pause on
 * the ticker line (the viewport) and on a ticker item's keyboard focus.
 *
 * CSS is a source-level contract here: the shipped stylesheet is the behaviour,
 * and no DOM/jsdom harness can resolve these cascade selectors faithfully.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8");

function pausedSelectors(): string[] {
  const match = /([^{}]+)\{\s*animation-play-state:\s*paused;\s*\}/.exec(css);
  if (!match) throw new Error("No animation-play-state: paused rule found");
  return match[1]
    .split(",")
    .map((selector) => selector.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

describe("now ticker pause selectors", () => {
  it("pauses only on the ticker viewport, item focus, or explicit state", () => {
    expect(pausedSelectors()).toEqual([
      ".now-ticker.is-running .now-ticker__viewport:hover .now-ticker__track",
      ".now-ticker.is-running:has(.now-ticker__item:focus-visible) .now-ticker__track",
      '.now-ticker[data-paused="true"] .now-ticker__track',
    ]);
  });

  it("never pauses from the toggle's own hover or focus", () => {
    const selectors = pausedSelectors().join(", ");
    expect(selectors).not.toMatch(/\.now-ticker\.is-running:hover/);
    expect(selectors).not.toContain(":focus-within");
  });
});
