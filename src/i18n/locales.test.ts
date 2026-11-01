/**
 * Locale resolution guards.
 *
 * `resolveLocale` narrows values that originate outside TypeScript (for
 * example `Astro.currentLocale`), so an inherited `Object.prototype` member
 * must never be accepted as a locale.
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, resolveClientLocale, resolveLocale } from "./locales";

describe("resolveLocale", () => {
  it("accepts every declared locale code", () => {
    expect(resolveLocale("zh-hant")).toBe("zh-hant");
    expect(resolveLocale("zh-hans")).toBe("zh-hans");
    expect(resolveLocale("en")).toBe("en");
  });

  it("falls back to the default for inherited object members", () => {
    expect(resolveLocale("toString")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("constructor")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("__proto__")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("hasOwnProperty")).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the default for missing or unknown codes", () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("fr")).toBe(DEFAULT_LOCALE);
  });
});

describe("resolveClientLocale", () => {
  it("does not treat an inherited member stored value as a locale", () => {
    expect(resolveClientLocale("toString", null)).toBe(DEFAULT_LOCALE);
    expect(resolveClientLocale("__proto__", "en-US")).toBe("en");
  });
});
