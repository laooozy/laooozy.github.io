/**
 * i18n key-parity guard.
 *
 * Every locale in `src/i18n/index.ts` must define EXACTLY the same set of
 * translation keys. A key present in one locale but missing from another makes
 * `t()` fall back to returning the raw dotted key string for that locale (see
 * `t()`'s documented fallback) — a bug that ships silently because `astro check`
 * cannot see it: each locale is an independent `as const` object with no shared
 * structural constraint, and a missing key still typechecks.
 *
 * This guard walks each locale's `ui` tree to FULL depth — through nested
 * objects AND through arrays (so keys inside array elements are compared too,
 * e.g. `acgPage.approach[].title`) — compares the resulting dotted key-path
 * sets against the zh-hant reference (the default / fallback locale), and fails
 * with the exact dotted path and the offending locale.
 */
import { describe, expect, it } from "vitest";

import { ui } from "./index";

/** The three site locales. zh-hant is the default/fallback, used as reference. */
const LOCALES = ["zh-hant", "zh-hans", "en"] as const;

/** The locale every other locale is compared against. */
const REFERENCE: (typeof LOCALES)[number] = "zh-hant";

/**
 * Collect every dotted key path reachable in a dictionary tree.
 *
 * - object branch → `parent.key`
 * - array → walks each element under a `parent[]` segment, so a key nested in an
 *   array element (e.g. `acgPage.approach[].title`) is compared as well
 * - scalar leaf → its own path
 */
function collectKeyPaths(
  value: unknown,
  prefix = "",
  out: Set<string> = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeyPaths(item, `${prefix}[]`, out);
    return out;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      collectKeyPaths(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.add(prefix);
  return out;
}

describe("i18n ui key parity", () => {
  it("ships exactly the three known locales", () => {
    expect(Object.keys(ui).sort()).toEqual([...LOCALES].sort());
  });

  it("walks nested objects and arrays to full depth", () => {
    const paths = collectKeyPaths(ui[REFERENCE]);

    // A plain nested key, a key inside an array element, and an array leaf.
    expect(paths.has("home.interests.photography")).toBe(true);
    expect(paths.has("acgPage.approach[].title")).toBe(true);
    expect(paths.has("acgPage.commissionPoints[]")).toBe(true);
  });

  it("every locale defines exactly the keys of the reference locale", () => {
    const reference = collectKeyPaths(ui[REFERENCE]);
    const offenders: string[] = [];

    for (const locale of LOCALES) {
      if (locale === REFERENCE) continue;
      const paths = collectKeyPaths(ui[locale]);

      for (const path of reference) {
        if (!paths.has(path)) offenders.push(`${locale}: missing "${path}"`);
      }
      for (const path of paths) {
        if (!reference.has(path)) offenders.push(`${locale}: extra "${path}"`);
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `i18n key-parity guard failed (${offenders.length} difference(s) ` +
          `against "${REFERENCE}"):\n` +
          offenders.map((line) => `  - ${line}`).join("\n"),
      );
    }

    expect(offenders).toEqual([]);
  });
});
