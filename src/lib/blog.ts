/**
 * Blog data + URL helpers.
 *
 * The blog index is paginated PER LOCALE — Astro's `paginate()` does not fan
 * out across locales, so each `pages/<locale?>/blog/[...page].astro` route
 * calls these helpers with its own locale. Filtering is build-time only: the
 * page never ships the full post set to the browser for client-side paging.
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLang, languages, type Locale } from "../i18n/ui";

export type Post = CollectionEntry<"blog">;

/** Posts shown per page (build-time pagination). */
export const PAGE_SIZE = 4;

/** Every non-draft post for one locale, newest first (`date` desc, title tie-break). */
export async function getPostsByLocale(lang: Locale): Promise<Post[]> {
  const posts = await getCollection(
    "blog",
    ({ data }) => data.lang === lang && !data.draft,
  );
  return [...posts].sort(
    (a, b) =>
      b.data.date.getTime() - a.data.date.getTime() ||
      a.data.title.localeCompare(b.data.title),
  );
}

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

/** URL prefix for a locale: `zh-hant` is served unprefixed at the root. */
export function localePrefix(lang: Locale): string {
  return lang === defaultLang ? "" : `/${lang}`;
}

export function blogIndexPath(lang: Locale): string {
  return `${localePrefix(lang)}/blog/`;
}

export function blogTagPath(lang: Locale, tag: string): string {
  return `${localePrefix(lang)}/blog/tags/${encodeURIComponent(tag)}/`;
}

export function blogArchivePath(lang: Locale, period: string): string {
  return `${localePrefix(lang)}/blog/archive/${period}/`;
}

export function blogPostPath(lang: Locale, slug: string): string {
  return `${localePrefix(lang)}/blog/${slug}/`;
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

/** The three locale codes, in i18n declaration order. */
export const LOCALES = Object.keys(languages) as Locale[];
