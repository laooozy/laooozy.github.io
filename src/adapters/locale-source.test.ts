/**
 * Unit tests for the locale-source port.
 *
 * `fixedLocaleSource` is the deterministic double; `navigatorLocaleSource` is
 * the real adapter over `navigator.language`. The port contract: `read()` always
 * returns a raw string or `null` and never throws, even when `navigator` is
 * absent (as in a bare Node test runner).
 */
import { describe, expect, it } from "vitest";

import {
  fixedLocaleSource,
  navigatorLocaleSource,
} from "@/adapters/locale-source";

describe("fixedLocaleSource", () => {
  it("returns the fixed BCP-47 tag", () => {
    expect(fixedLocaleSource("en-US").read()).toBe("en-US");
  });

  it("returns null when fixed to null", () => {
    expect(fixedLocaleSource(null).read()).toBeNull();
  });
});

describe("navigatorLocaleSource", () => {
  it("returns a string or null without throwing", () => {
    let value: string | null = "unset";
    expect(() => {
      value = navigatorLocaleSource.read();
    }).not.toThrow();
    expect(value === null || typeof value === "string").toBe(true);
  });
});
