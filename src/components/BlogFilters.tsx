/**
 * BlogFilters — the build-time filter tray for every blog listing.
 *
 * Two control groups:
 *  - By tag: an "All posts" reset chip (filled while the index is unfiltered)
 *    followed by every tag. Tags are the primary browsing axis, so this group
 *    leads.
 *  - By date: the year (and month) archives present in the set.
 *
 * Every chip here is a CONTROL (`ChipRow variant="filter"`): outlined at rest,
 * tinted on hover, solid-accent when `active` — so a filter can never be
 * mistaken for a post's tag label. A `Separator` closes the tray and divides it
 * from the post list below.
 *
 * All copy is i18n-driven; the "All posts" href is derived from the locale, so
 * the reset always lands on that locale's index.
 */
import ChipRow from "./ChipRow";
import Separator from "./ui/Separator";
import type { FilterLink } from "./types";
import { useTranslations, type Locale } from "../i18n/ui";
import { blogIndexPath } from "../lib/blog";

interface BlogFiltersProps {
  locale: Locale;
  tags?: FilterLink[];
  periods?: FilterLink[];
  className?: string;
}

export default function BlogFilters({
  locale,
  tags = [],
  periods = [],
  className,
}: BlogFiltersProps) {
  const t = useTranslations(locale);

  // The unfiltered index: no tag and no period is active.
  const noneActive =
    !tags.some((item) => item.active) && !periods.some((item) => item.active);

  const tagItems: FilterLink[] = [
    { label: t.blog.allPosts, href: blogIndexPath(locale), active: noneActive },
    ...tags,
  ];

  return (
    <nav
      className={["blog-filters", className].filter(Boolean).join(" ")}
      aria-label={t.blog.filters}
    >
      <div className="blog-filters__groups">
        {tagItems.length > 1 && (
          <div className="blog-filters__group">
            <span className="blog-filters__label">{t.blog.byTag}</span>
            <ChipRow variant="filter" items={tagItems} gap={2} />
          </div>
        )}
        {periods.length > 0 && (
          <div className="blog-filters__group">
            <span className="blog-filters__label">{t.blog.byDate}</span>
            <ChipRow variant="filter" items={periods} gap={2} />
          </div>
        )}
      </div>
      <Separator className="blog-filters__rule" />
    </nav>
  );
}
