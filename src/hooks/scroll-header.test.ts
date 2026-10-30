/**
 * Unit tests for the pure header-visibility decision.
 *
 * `resolveHeaderHidden` is the whole rule the scroll hook applies, extracted so
 * it is testable without a DOM or a React renderer. Cases: near the top always
 * reveals; a downward move past the top band hides; any upward move reveals; a
 * no-op frame keeps the current visibility.
 */
import { describe, expect, it } from "vitest";

import { NEAR_TOP_PX, resolveHeaderHidden } from "@/hooks/useScrollHeader";

describe("resolveHeaderHidden", () => {
  it("reveals within the near-top band regardless of direction", () => {
    expect(
      resolveHeaderHidden({ scrollY: 0, lastScrollY: 100, hidden: true }),
    ).toBe(false);
    expect(
      resolveHeaderHidden({
        scrollY: NEAR_TOP_PX,
        lastScrollY: 500,
        hidden: true,
      }),
    ).toBe(false);
  });

  it("hides when scrolling down past the top band", () => {
    expect(
      resolveHeaderHidden({ scrollY: 200, lastScrollY: 120, hidden: false }),
    ).toBe(true);
  });

  it("reveals on any upward movement", () => {
    expect(
      resolveHeaderHidden({ scrollY: 120, lastScrollY: 200, hidden: true }),
    ).toBe(false);
  });

  it("keeps the current visibility on a no-op frame", () => {
    expect(
      resolveHeaderHidden({ scrollY: 200, lastScrollY: 200, hidden: true }),
    ).toBe(true);
    expect(
      resolveHeaderHidden({ scrollY: 200, lastScrollY: 200, hidden: false }),
    ).toBe(false);
  });

  it("never hides while the mobile menu is open", () => {
    expect(
      resolveHeaderHidden(
        { scrollY: 240, lastScrollY: 120, hidden: false },
        NEAR_TOP_PX,
        { menuOpen: true, focusWithinHeader: false },
      ),
    ).toBe(false);
  });

  it("never hides while focus is inside the header", () => {
    expect(
      resolveHeaderHidden(
        { scrollY: 240, lastScrollY: 120, hidden: true },
        NEAR_TOP_PX,
        { menuOpen: false, focusWithinHeader: true },
      ),
    ).toBe(false);
  });

  it("hides again on scroll-down once the guard is clear", () => {
    expect(
      resolveHeaderHidden(
        { scrollY: 240, lastScrollY: 120, hidden: false },
        NEAR_TOP_PX,
        { menuOpen: false, focusWithinHeader: false },
      ),
    ).toBe(true);
  });
});
