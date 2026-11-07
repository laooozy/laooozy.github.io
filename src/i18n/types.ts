/**
 * Pure i18n types — no Astro, no DOM, no runtime imports.
 *
 * `DotPaths` derives the set of dotted key paths that point at a translatable
 * string leaf, so `t()` gets typed keys without hard-coding a second key list.
 */

/**
 * Recursively build a union of dotted paths (`"blog.pageOf"`) that resolve to a
 * string leaf of a dictionary tree. Object branches are walked; arrays are
 * skipped (their contents are rendered directly, not addressed by `t()`).
 */
export type DotPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : DotPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Values accepted for `{var}` interpolation in a translated string. */
export type TranslationVars = Record<string, string | number>;
