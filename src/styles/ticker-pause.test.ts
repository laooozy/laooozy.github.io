/**
 * Regression guard for the "now" ticker pause behaviour.
 *
 * The explicit Play button must be able to resume the marquee while that
 * button itself keeps focus or hover — so the pause must live on the track
 * (line hover, item keyboard focus, explicit paused state), never on the whole
 * `.now-ticker` (`:hover` / `:focus-within`). The marquee is authored as
 * Tailwind utility classes in `NowTickerClient.tsx`; this test reads that
 * source because no DOM/jsdom harness resolves the cascade faithfully.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../components/site/NowTickerClient.tsx", import.meta.url),
  "utf8",
);

describe("now ticker pause selectors", () => {
  it("pauses only on the ticker line, item focus, or explicit state", () => {
    expect(source).toContain("hover:[animation-play-state:paused]");
    expect(source).toContain(
      "has-[:focus-visible]:[animation-play-state:paused]",
    );
    expect(source).toContain(
      'running && paused && "[animation-play-state:paused]"',
    );
  });

  it("never pauses from the toggle's own hover or focus", () => {
    expect(source).not.toContain(":focus-within");
    expect(source).not.toMatch(/now-ticker[^"]*:hover/);
  });
});
