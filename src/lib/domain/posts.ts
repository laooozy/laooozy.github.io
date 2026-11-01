/**
 * Blog post domain — PURE.
 *
 * No content-collection imports, no i18n runtime, no DOM: every function here
 * is a plain data transform over an already-loaded post set. The I/O edge that
 * actually reads the content collection lives in `../io/posts.ts`.
 *
 * Content is LANGUAGE-AGNOSTIC: every locale shows the SAME set of posts,
 * rendered with that locale's UI chrome.
 *
 * The site is single-URL: path builders are LOCALE-FREE. `formatPostDate` /
 * `formatPeriodLabel` still take a `lang`, because they format *text*, not URLs.
 */
import type { Locale } from "../../i18n/types";
import { parsePostId } from "./filename";

/** Frontmatter shape of a blog post (mirrors the collection schema). */
export interface PostData {
  title: string;
  description: string;
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

/**
 * The post's calendar date, the filename `YYYY-MM-DD` taken verbatim
 * (`yyyy-mm-dd_slug`). This is a date, not an instant: it never passes through
 * a `Date`, so it is identical in every build and viewer timezone.
 *
 * A malformed id is a build-time error and throws.
 */
export function postDateString(post: Post): string {
  const parsed = parsePostId(post.id);
  if (!parsed.ok) {
    throw new Error(`Invalid post filename id "${post.id}": ${parsed.reason}`);
  }
  return parsed.date;
}

/**
 * Newest first by the filename calendar date, title as the tie-break. ISO
 * `YYYY-MM-DD` strings compare lexicographically in date order, so no `Date`
 * (and no timezone) is involved.
 */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dateA = postDateString(a);
    const dateB = postDateString(b);
    if (dateA !== dateB) return dateA < dateB ? 1 : -1;
    return a.data.title.localeCompare(b.data.title);
  });
}

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

/**
 * `YYYY` keys present in a post set, newest first.
 *
 * The listing only links year archives, so month keys are deliberately not
 * emitted: a month key would imply a `YYYY-MM` route that does not exist.
 * `matchesPeriod` still understands month keys for callers that need them.
 */
export function collectPeriods(posts: Post[]): string[] {
  const years = new Set<string>();
  for (const post of posts) {
    years.add(postDateString(post).slice(0, 4));
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

/** A tag filter chip: raw tag, its listing URL, and whether it is active. */
export interface ListingTagFilter {
  tag: string;
  href: string;
  active: boolean;
}

/** A year filter chip: raw `YYYY`, its archive URL, and whether it is active. */
export interface ListingPeriodFilter {
  period: string;
  href: string;
  active: boolean;
}

/** Which filter, if any, the current listing represents. */
export interface ListingFilterSelection {
  tag?: string;
  period?: string;
}

/** The complete filter tray for a listing, built from its full post set. */
export interface ListingFilters {
  tags: ListingTagFilter[];
  periods: ListingPeriodFilter[];
}

/**
 * Build the tag and year filter links every blog listing shares, marking the
 * one matching `active` (the index passes no selection, so nothing is active).
 */
export function buildListingFilters(
  posts: Post[],
  active: ListingFilterSelection = {},
): ListingFilters {
  return {
    tags: collectTags(posts).map((tag) => ({
      tag,
      href: blogTagPath(tag),
      active: tag === active.tag,
    })),
    periods: collectPeriods(posts).map((period) => ({
      period,
      href: blogArchivePath(period),
      active: period === active.period,
    })),
  };
}

/** Does a post belong to a `YYYY` or `YYYY-MM` archive period? */
export function matchesPeriod(post: Post, period: string): boolean {
  const date = postDateString(post);
  if (period.length === 4) return date.slice(0, 4) === period;
  return date.slice(0, 7) === period;
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
 * A blog post reduced to the plain, serializable fields a listing island needs.
 * `date` is the filename calendar day (`YYYY-MM-DD`) and doubles as the
 * `datetime` value of `<time>`; `readingMinutes` is precomputed so no markdown
 * body ships to the client.
 */
export interface BlogListItem {
  href: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  tags: string[];
}

export function toBlogListItem(post: Post): BlogListItem {
  return {
    href: blogPostPath(post.id),
    title: post.data.title,
    description: post.data.description,
    date: postDateString(post),
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

/**
 * Human-readable single date, per locale, from the filename calendar day
 * (`YYYY-MM-DD`). Split-and-format only: no `Date`, so a viewer's timezone can
 * never move the day.
 */
export function formatPostDate(date: string, lang: Locale): string {
  const [year, month, day] = date.split("-").map(Number);
  if (lang === "en") return `${EN_MONTHS[month - 1]} ${day}, ${year}`;
  return `${year}年${month}月${day}日`;
}

/** Human-readable label for a `YYYY` or `YYYY-MM` archive period, per locale. */
export function formatPeriodLabel(period: string, lang: Locale): string {
  const [year, month] = period.split("-");
  if (!month) return lang === "en" ? year : `${year}年`;
  if (lang === "en") return `${EN_MONTHS[Number(month) - 1]} ${year}`;
  return `${year}年${Number(month)}月`;
}
