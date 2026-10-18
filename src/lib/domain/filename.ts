/**
 * Blog post filename convention - PURE.
 *
 * A post file MUST be named `yyyy-mm-dd_<slug>.md` and live in
 * `src/content/blog/`. The date in the filename is the source of truth (there
 * is no frontmatter `date` field). The URL is derived from the filename without
 * the extension (`post.id`), so the slug half IS the public path.
 *
 * There is deliberately no regex for the date logic. The date is read by
 * slicing fixed character positions and then validated against the real
 * calendar with `new Date(y, m - 1, d)` and a getter round-trip. That rejects
 * impossible days such as 2026-02-29 or 2026-04-31 while accepting genuine leap
 * days such as 2024-02-29 and 2000-02-29, and it reads as plain rules instead
 * of a pattern that hides them.
 *
 * The module is pure: no `node:fs`, no `astro:content`, no DOM. The I/O edge
 * that walks the content directory lives in `../io/blog-filenames.test.ts`.
 */

/** Result of checking a filename: the parsed date + slug, or why it failed. */
export type FilenameCheck =
  { ok: true; date: string; slug: string } | { ok: false; reason: string };

/** The extension every post file must carry. */
const EXTENSION = ".md";

/**
 * Shortest legal base name: `yyyy-mm-dd` (10) + `_` (1) + at least one slug
 * character. The slug rule (`^[a-z0-9]+(-[a-z0-9]+)*$`) accepts a single
 * character, so the shortest legal name is `2026-07-09_a.md`.
 */
const MIN_BASE_LENGTH = 12;

/** `true` for a single ASCII digit character. */
function isAsciiDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

/** `true` when `value` is non-empty and made only of ASCII digits. */
function isAllAsciiDigits(value: string): boolean {
  if (value.length === 0) return false;
  for (const char of value) {
    if (!isAsciiDigit(char)) return false;
  }
  return true;
}

/** `true` for a single lowercase ASCII letter or digit. */
function isSlugChar(char: string): boolean {
  return (char >= "a" && char <= "z") || isAsciiDigit(char);
}

/**
 * `true` when every `-`-separated segment is a non-empty run of `[a-z0-9]`.
 * This rejects empty (leading, trailing or doubled hyphens), uppercase,
 * underscores, slashes, spaces and every other non-slug character.
 */
function isSlug(value: string): boolean {
  if (value.length === 0) return false;
  for (const segment of value.split("-")) {
    if (segment.length === 0) return false;
    for (const char of segment) {
      if (!isSlugChar(char)) return false;
    }
  }
  return true;
}

/** Zero-pad a non-negative integer to at least two digits. */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Parse and validate a post id: the filename WITHOUT its `.md` extension.
 *
 * This is the shape `post.id` carries in the content collection, so callers
 * that already have the id (every domain transform) validate it directly. On
 * success returns the canonical `YYYY-MM-DD` date and the slug; on any
 * violation returns `{ ok: false, reason }` with a human-readable explanation.
 */
export function parsePostId(id: string): FilenameCheck {
  if (id.length < MIN_BASE_LENGTH) {
    return {
      ok: false,
      reason: `base name "${id}" is shorter than ${MIN_BASE_LENGTH} characters`,
    };
  }

  if (id[4] !== "-" || id[7] !== "-" || id[10] !== "_") {
    return {
      ok: false,
      reason: `expected "yyyy-mm-dd_slug"; the "-", "-" and "_" separators are not at positions 5, 8 and 11 in "${id}"`,
    };
  }

  const yearText = id.slice(0, 4);
  const monthText = id.slice(5, 7);
  const dayText = id.slice(8, 10);

  if (!isAllAsciiDigits(yearText)) {
    return { ok: false, reason: `year "${yearText}" is not four ASCII digits` };
  }
  if (!isAllAsciiDigits(monthText)) {
    return {
      ok: false,
      reason: `month "${monthText}" is not two ASCII digits`,
    };
  }
  if (!isAllAsciiDigits(dayText)) {
    return { ok: false, reason: `day "${dayText}" is not two ASCII digits` };
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (year < 1000 || year > 2999) {
    return { ok: false, reason: `year ${year} is outside 1000..2999` };
  }
  if (month < 1 || month > 12) {
    return { ok: false, reason: `month ${month} is outside 1..12` };
  }
  if (day < 1 || day > 31) {
    return { ok: false, reason: `day ${day} is outside 1..31` };
  }

  // Round-trip through a real Date: if the calendar rolls the day over
  // (2026-02-29 becomes 2026-03-01), the input was not a real date.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      ok: false,
      reason: `${yearText}-${monthText}-${dayText} is not a real calendar date`,
    };
  }

  const slug = id.slice(11);
  if (!isSlug(slug)) {
    return {
      ok: false,
      reason: `slug "${slug}" must be lowercase [a-z0-9] segments joined by single hyphens`,
    };
  }

  return {
    ok: true,
    date: `${pad2(year)}-${pad2(month)}-${pad2(day)}`,
    slug,
  };
}

/**
 * Parse and validate a post filename.
 *
 * Requires the `.md` extension, strips it, then delegates to `parsePostId` so
 * the id form and the filename form share exactly one set of rules.
 */
export function parsePostFilename(name: string): FilenameCheck {
  if (!name.endsWith(EXTENSION)) {
    return { ok: false, reason: `missing "${EXTENSION}" extension` };
  }
  return parsePostId(name.slice(0, -EXTENSION.length));
}
