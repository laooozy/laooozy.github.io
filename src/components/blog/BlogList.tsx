/**
 * BlogList — the single shared renderer for every blog listing: the paginated
 * index, tag pages, and date-archive pages, as a hydrated React island.
 *
 * Composition (all from the reusable kit):
 *  - a masthead (`Heading` level 1),
 *  - the filter tray (`BlogFilters`) whenever EITHER tags or periods exist,
 *  - the post list — one `PostCard` (variant="row") per post,
 *  - `BlogPagination` when the set spans more than one page,
 *  - `BlogEmpty` when the filtered set has no posts.
 *
 * Every label is re-derived per active locale on the client (mounted gate,
 * mirroring the hydrated chrome): the masthead from a locale-independent
 * descriptor, the period chips from their raw `YYYY`/`YYYY-MM` keys, and each
 * post's date, reading time and action inside `PostCard`. Paging links are
 * locale-free. Search is global chrome (`SearchCommand` in the layout), not a
 * listing child.
 */
import { useEffect, useState } from "react";

import BlogEmpty from "@/components/blog/BlogEmpty";
import BlogFilters from "@/components/blog/BlogFilters";
import BlogPagination from "@/components/blog/BlogPagination";
import PostCard from "@/components/blog/PostCard";
import type { FilterLink, Pagination } from "@/components/shared/types";
import Heading from "@/components/shared/typography/Heading";
import { useLocale } from "@/hooks/useLocale";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { type BlogListItem, formatPeriodLabel } from "@/lib/domain/posts";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

/** A raw tag filter; its label is the tag itself (locale-independent). */
export interface BlogTagLink {
  tag: string;
  href: string;
  active?: boolean;
}

/** A raw `YYYY` / `YYYY-MM` period filter; its label is formatted per locale. */
export interface BlogPeriodLink {
  period: string;
  href: string;
  active?: boolean;
}

/** The listing masthead, re-derived per active locale on the client. */
export type BlogHeading =
  | { kind: "index" }
  | { kind: "tag"; tag: string }
  | { kind: "archive"; period: string };

interface BlogListProps {
  /** Posts, already mapped to the serializable listing shape by the page. */
  posts: BlogListItem[];
  /** Which heading this listing shows. */
  heading: BlogHeading;
  tags?: BlogTagLink[];
  periods?: BlogPeriodLink[];
  pagination?: Pagination;
}

export default function BlogList({
  posts,
  heading,
  tags = [],
  periods = [],
  pagination,
}: BlogListProps) {
  const t = useT();
  const { locale } = useLocale();
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  const activeLocale = mounted ? locale : defaultLang;

  const title = (() => {
    switch (heading.kind) {
      case "index":
        return tr("blog.heading");
      case "tag":
        return `#${heading.tag}`;
      case "archive":
        return formatPeriodLabel(heading.period, activeLocale);
    }
  })();

  const tagLinks: FilterLink[] = tags.map((item) => ({
    label: item.tag,
    href: item.href,
    active: item.active,
  }));

  const periodLinks: FilterLink[] = periods.map((item) => ({
    label: formatPeriodLabel(item.period, activeLocale),
    href: item.href,
    active: item.active,
  }));

  const showFilters = tagLinks.length > 0 || periodLinks.length > 0;

  return (
    <section
      className="grid gap-(--space-6) lg:gap-(--space-8)"
      aria-labelledby="blog-heading"
      data-blog-listing
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Heading
          level={1}
          id="blog-heading"
          className="text-[length:var(--text-page-title)]"
        >
          {title}
        </Heading>
      </header>

      {showFilters && <BlogFilters tags={tagLinks} periods={periodLinks} />}

      {posts.length > 0 ? (
        <ul className="m-0 grid list-none gap-(--space-4) p-0">
          {posts.map((post) => (
            <li key={post.href} className="min-w-0">
              <PostCard
                variant="row"
                href={post.href}
                title={post.title}
                description={post.description}
                date={post.date}
                readingMinutes={post.readingMinutes}
                tags={post.tags}
              />
            </li>
          ))}
        </ul>
      ) : (
        <BlogEmpty />
      )}

      {pagination && pagination.lastPage > 1 && (
        <BlogPagination pagination={pagination} />
      )}
    </section>
  );
}
