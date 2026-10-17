/**
 * Blog post domain — PURE.
 *
 * No content-collection imports, no i18n runtime, no DOM: every function here
 * is a plain data transform over an already-loaded post set. The I/O edge that
 * actually reads the content collection lives in `../io/posts.ts`.
 *
 * Content is LANGUAGE-AGNOSTIC: every locale shows the SAME set of posts,
 * rendered with that locale's UI chrome. Post frontmatter may still carry a
 * `lang`, but it never filters or hides a post — the getter ignores it.
 *
 * The site is single-URL: path builders are LOCALE-FREE. `formatPostDate` /
 * `formatPeriodLabel` still take a `lang`, because they format *text*, not URLs.
 */
import type { Locale } from "../../i18n/types";

/** Frontmatter shape of a blog post (mirrors the collection schema). */
export interface PostData {
  title: string;
  description: string;
  date: Date;
  tags: string[];
  draft: boolean;
}

/**
 * A blog post, structurally identical to the `blog` collection entry so it can
 * flow from the I/O edge into `render()` without importing the content module.
 */
export interface Post {
  id: string;
  body?: string;
  collection: "blog";
  data: PostData;
}

/** Posts shown per page (build-time pagination). */
export const PAGE_SIZE = 4;

/** The three locale codes, in i18n declaration order. */
export const LOCALES: readonly Locale[] = ["zh-hant", "zh-hans", "en"];

/** Unique tags across a post set, sorted for stable output. */
export function collectTags(posts: Post[]): string[] {
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.data.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/** `YYYY` and `YYYY-MM` keys present in a post set, newest first (months, then years). */
export function collectPeriods(posts: Post[]): string[] {
  const years = new Set<string>();
  const months = new Set<string>();
  for (const post of posts) {
    const date = post.data.date;
    const year = String(date.getFullYear());
    const month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    years.add(year);
    months.add(month);
  }
  const desc = (a: string, b: string) => b.localeCompare(a);
  return [...[...months].sort(desc), ...[...years].sort(desc)];
}

/** Does a post belong to a `YYYY` or `YYYY-MM` archive period? */
export function matchesPeriod(post: Post, period: string): boolean {
  const date = post.data.date;
  const year = String(date.getFullYear());
  if (period.length === 4) return year === period;
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return month === period;
}

/** The unfiltered blog index. */
export function blogIndexPath(): string {
  return "/blog/";
}

/** A single tag's listing. */
export function blogTagPath(tag: string): string {
  return `/blog/tags/${encodeURIComponent(tag)}/`;
}

/** A `YYYY` or `YYYY-MM` date archive. */
export function blogArchivePath(period: string): string {
  return `/blog/archive/${period}/`;
}

/** A single post. */
export function blogPostPath(slug: string): string {
  return `/blog/${slug}/`;
}

/**
 * `YYYY-MM-DD` for a Date's LOCAL calendar day. Build-time dates are
 * formatted on the client, so the calendar day is frozen here (never the raw
 * instant) to keep the same day in every timezone — `getFullYear`/`getMonth`/
 * `getDate` read the local day, and the client rehydrates it with
 * `new Date(\`${date}T00:00:00\`)` (local midnight).
 */
export function toLocalDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A blog post reduced to the plain, serializable fields a listing island needs.
 * `date` is the build-local calendar day (`YYYY-MM-DD`); `datetime` keeps the
 * full ISO instant for `<time datetime>`; `readingMinutes` is precomputed so no
 * markdown body ships to the client.
 */
export interface BlogListItem {
  href: string;
  title: string;
  description: string;
  date: string;
  datetime: string;
  readingMinutes: number;
  tags: string[];
}

export function toBlogListItem(post: Post): BlogListItem {
  return {
    href: blogPostPath(post.id),
    title: post.data.title,
    description: post.data.description,
    date: toLocalDateString(post.data.date),
    datetime: post.data.date.toISOString(),
    readingMinutes: estimateReadingTime(post.body),
    tags: post.data.tags,
  };
}

/**
 * Estimate reading time (whole minutes, minimum 1) from a markdown body.
 *
 * CJK scripts are counted per glyph (~400 glyphs/min) and Latin script per
 * word (~200 words/min); the two budgets are summed so mixed prose stays fair.
 */
export function estimateReadingTime(body: string | undefined): number {
  const text = body ?? "";
  const cjk = (
    text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []
  ).length;
  const latin = (
    text
      .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, " ")
      .match(/[A-Za-z0-9]+/g) ?? []
  ).length;
  return Math.max(1, Math.ceil(cjk / 400 + latin / 200));
}

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Human-readable single date, per locale. */
export function formatPostDate(date: Date, lang: Locale): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  if (lang === "en") return `${EN_MONTHS[month]} ${day}, ${year}`;
  return `${year}年${month + 1}月${day}日`;
}

/** Human-readable label for a `YYYY` or `YYYY-MM` archive period, per locale. */
export function formatPeriodLabel(period: string, lang: Locale): string {
  const [year, month] = period.split("-");
  if (!month) return lang === "en" ? year : `${year}年`;
  if (lang === "en") return `${EN_MONTHS[Number(month) - 1]} ${year}`;
  return `${year}年${Number(month)}月`;
}
