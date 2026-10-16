/**
 * BlogList — the single shared renderer for every blog listing: the paginated
 * index, tag pages, and date-archive pages, as a hydrated React island.
 *
 * Composition (all from the reusable kit):
 *  - a masthead (`Heading` level 1 + the injected search island),
 *  - the filter tray (`BlogFilters`),
 *  - the post list — one `PostCard` (variant="row") per post, a wide glass
 *    entry with a mono date rail,
 *  - `BlogPagination` when the set spans more than one page.
 *
 * Every label is re-derived per active locale on the client (mounted gate,
 * mirroring `HomePage`): the masthead from a locale-independent descriptor, the
 * period chips from their raw `YYYY`/`YYYY-MM` keys, and each post's date and
 * reading time inside `PostCard`. Paging links are locale-free. The search
 * island is passed in as `children` from the page so it keeps its own
 * `client:idle` hydration (Astro hydrates islands nested in a framework
 * component's children).
 */
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import BlogFilters from "@/components/BlogFilters";
import BlogPagination from "@/components/BlogPagination";
import PostCard from "@/components/PostCard";
import Heading from "@/components/ui/Heading";
import Text from "@/components/ui/Text";
import type { FilterLink, Pagination } from "@/components/types";
import { useLocale } from "@/hooks/useLocale";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { formatPeriodLabel, type BlogListItem } from "@/lib/domain/posts";

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
  /** The search island, supplied by the page so it keeps `client:idle`. */
  children?: ReactNode;
}

export default function BlogList({
  posts,
  heading,
  tags = [],
  periods = [],
  pagination,
  children,
}: BlogListProps) {
  const t = useT(clientDeps);
  const { locale } = useLocale(clientDeps);
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

  return (
    <section className="blog-index" aria-labelledby="blog-heading">
      <header className="blog-index__header">
        <Heading level={1} id="blog-heading" className="blog-index__title">
          {title}
        </Heading>
        {children}
      </header>

      {tagLinks.length > 0 && (
        <BlogFilters tags={tagLinks} periods={periodLinks} />
      )}

      {posts.length > 0 ? (
        <ul className="blog-list">
          {posts.map((post) => (
            <li key={post.href}>
              <PostCard
                variant="row"
                href={post.href}
                title={post.title}
                description={post.description}
                date={post.date}
                datetime={post.datetime}
                readingMinutes={post.readingMinutes}
                tags={post.tags}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Text tone="muted">{tr("blog.empty")}</Text>
      )}

      {pagination && pagination.lastPage > 1 && (
        <BlogPagination pagination={pagination} />
      )}
    </section>
  );
}
