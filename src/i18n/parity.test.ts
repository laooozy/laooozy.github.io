/**
 * i18n key-parity and used-key guards.
 *
 * The dictionaries in `src/i18n/index.ts` now hold FIXED CHROME strings only.
 * Page content lives in the MDX entries (`src/content/pages/*.mdx`) and is
 * always zh-hant; the chrome is the only locale-reactive surface.
 *
 * Two contracts are enforced here:
 *
 * 1. Every locale defines EXACTLY the same set of keys (and exactly the fixed
 *    chrome set). A key present in one locale but missing from another makes
 *    `t()` fall back to returning the raw dotted key string for that locale
 *    (see `t()`'s documented fallback) — a bug that ships silently because
 *    `astro check` cannot see it: each locale is an independent `as const`
 *    object with no shared structural constraint, and a missing key still
 *    typechecks.
 *
 * 2. Every literal key referenced from source (`t("…")`, `tr("…")`,
 *    `translate("locale", "…")` and `<T k="…" />`) exists in the reference
 *    dictionary. Static dictionary access (`t.home.title`) is already
 *    typechecked by `useTranslations`; this guard covers the string form that
 *    the type system cannot see.
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { t, ui } from "./index";

/** The three site locales. zh-hant is the default/fallback, used as reference. */
const LOCALES = ["zh-hant", "zh-hans", "en"] as const;

/** The locale every other locale is compared against. */
const REFERENCE: (typeof LOCALES)[number] = "zh-hant";

/**
 * The complete fixed-chrome key set.
 *
 * Content branches (the old home intro/interests/now-text keys, the ACG page,
 * about and contact blocks, and the ACG card copy) are deliberately absent:
 * that copy now lives in the zh-hant MDX pages. Later tasks that add fixed chrome
 * keys (`nav.photography`, `now.pause`/`now.play`, `search.error`,
 * `blog.pagination`) must add them here and to all three locales.
 */
const FIXED_KEYS = [
  "nav.about",
  "nav.blog",
  "nav.photography",
  "nav.contact",
  "nav.usefulLink",
  "a11y.skipToContent",
  "a11y.primaryNav",
  "a11y.language",
  "a11y.menu",
  "button.viewAll",
  "blog.heading",
  "blog.empty",
  "blog.readTime",
  "blog.backToIndex",
  "blog.tagged",
  "blog.allPosts",
  "blog.filters",
  "blog.byDate",
  "blog.byTag",
  "blog.prev",
  "blog.next",
  "blog.pageOf",
  "blog.pagination",
  "search.trigger",
  "search.title",
  "search.placeholder",
  "search.hint",
  "search.searching",
  "search.noResults",
  "search.error",
  "search.resultCount",
  "search.close",
  "links.title",
  "notFound.title",
  "notFound.heading",
  "notFound.body",
  "notFound.backHome",
  "footer.rights",
  "footer.updated",
  "home.title",
  "home.nowLabel",
  "now.pause",
  "now.play",
] as const;

/**
 * Collect every dotted key path reachable in a dictionary tree.
 *
 * - object branch → `parent.key`
 * - array → walks each element under a `parent[]` segment
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

/** Files scanned by the used-key guard. */
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".astro", ".mdx"]);

/** Directories under `src/` that hold source, tests or generated output. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
      continue;
    }
    if (entry.name.includes(".test.")) continue;
    if (SCAN_EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

/**
 * A call to `t`, `tr` or `translate` whose FIRST string-literal argument is a
 * key: either `t("blog.empty")` or the locale-first form
 * `t(defaultLang, "blog.empty")`. The `useT` alias (`const t = useT(...)`) and
 * the hydration-safe `tr` alias are both plain calls, so they are covered here.
 */
const CALL_KEY_RE =
  /\b(?:t|tr|translate)\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?(["'`])([^"'`\n]+)\1/g;

/** `<T k="a11y.language" />` in React/Astro. */
const T_COMPONENT_KEY_RE = /<T\b[^>]*\bk=(?:"([^"]+)"|'([^']+)')/g;

/** Extract every literal key reference with its source file. */
function collectReferencedKeys(): Map<string, Set<string>> {
  const refs = new Map<string, Set<string>>();
  const root = join(process.cwd(), "src");

  for (const file of collectSourceFiles(root)) {
    const source = readFileSync(file, "utf8");
    const rel = relative(process.cwd(), file);

    for (const match of source.matchAll(CALL_KEY_RE)) {
      const key = match[2];
      const files = refs.get(key) ?? new Set<string>();
      files.add(rel);
      refs.set(key, files);
    }
    for (const match of source.matchAll(T_COMPONENT_KEY_RE)) {
      const key = match[1] ?? match[2];
      const files = refs.get(key) ?? new Set<string>();
      files.add(rel);
      refs.set(key, files);
    }
  }

  return refs;
}

describe("i18n ui key parity", () => {
  it("ships exactly the three known locales", () => {
    expect(Object.keys(ui).sort()).toEqual([...LOCALES].sort());
  });

  it("defines exactly the fixed-chrome key set", () => {
    const paths = collectKeyPaths(ui[REFERENCE]);

    expect(paths.has("nav.about")).toBe(true);
    expect(paths.has("blog.pageOf")).toBe(true);
    expect(paths.has("a11y.language")).toBe(true);

    expect([...paths].sort()).toEqual([...FIXED_KEYS].sort());
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

  it("every literal key referenced from source exists in the dictionary", () => {
    const paths = collectKeyPaths(ui[REFERENCE]);
    const referenced = collectReferencedKeys();

    expect(referenced.size).toBeGreaterThan(0);

    const missing = [...referenced.entries()]
      .filter(([key]) => !paths.has(key))
      .map(([key, files]) => `${key} (used in ${[...files].join(", ")})`);

    if (missing.length > 0) {
      throw new Error(
        `used-key guard failed (${missing.length} unknown key(s)):\n` +
          missing.map((line) => `  - ${line}`).join("\n"),
      );
    }

    expect(missing).toEqual([]);
  });
});

describe("search result count copy", () => {
  it("is grammatical for 0/1/2+ results in English", () => {
    expect(t("en", "search.resultCount", { count: 0 })).toBe("Results: 0");
    expect(t("en", "search.resultCount", { count: 1 })).toBe("Results: 1");
    expect(t("en", "search.resultCount", { count: 2 })).toBe("Results: 2");
    expect(t("en", "search.resultCount", { count: 12 })).toBe("Results: 12");
  });

  it("leaves the Chinese result counts unchanged", () => {
    expect(t("zh-hant", "search.resultCount", { count: 1 })).toBe(
      "找到 1 筆結果",
    );
    expect(t("zh-hans", "search.resultCount", { count: 2 })).toBe(
      "找到 2 条结果",
    );
  });
});
