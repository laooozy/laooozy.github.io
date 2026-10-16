/**
 * BlogFilters — the filter tray for every blog listing.
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
 * Labels come from `useT`, bound to the store's active locale, so they re-render
 * in place when the language switcher changes (mounted gate, mirroring
 * `HomePage`). `href`s are locale-free, so the reset always lands on the single
 * `/blog/` index.
 */
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import ChipRow from "@/components/ChipRow";
import Separator from "@/components/ui/Separator";
import type { FilterLink } from "@/components/types";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { blogIndexPath } from "@/lib/domain/posts";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface BlogFiltersProps {
  tags?: FilterLink[];
  periods?: FilterLink[];
  className?: string;
}

export default function BlogFilters({
  tags = [],
  periods = [],
  className,
}: BlogFiltersProps) {
  const t = useT(clientDeps);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

  // The unfiltered index: no tag and no period is active.
  const noneActive =
    !tags.some((item) => item.active) && !periods.some((item) => item.active);

  const tagItems: FilterLink[] = [
    { label: tr("blog.allPosts"), href: blogIndexPath(), active: noneActive },
    ...tags,
  ];

  return (
    <nav
      className={["blog-filters", className].filter(Boolean).join(" ")}
      aria-label={tr("blog.filters")}
    >
      <div className="blog-filters__groups">
        {tagItems.length > 1 && (
          <div className="blog-filters__group">
            <span className="blog-filters__label">{tr("blog.byTag")}</span>
            <ChipRow variant="filter" items={tagItems} gap={2} />
          </div>
        )}
        {periods.length > 0 && (
          <div className="blog-filters__group">
            <span className="blog-filters__label">{tr("blog.byDate")}</span>
            <ChipRow variant="filter" items={periods} gap={2} />
          </div>
        )}
      </div>
      <Separator className="blog-filters__rule" />
    </nav>
  );
}
