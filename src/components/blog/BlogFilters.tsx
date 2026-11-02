/**
 * BlogFilters — the filter tray for every blog listing.
 *
 * Three groups, in reading order:
 *  - the "All posts" reset, always present so a period-only listing can still
 *    clear its filter;
 *  - by tag, only when the post set actually has tags;
 *  - by date, only when it has periods.
 *
 * Every item is a plain anchor, so filters stay ordinary URLs with native link
 * semantics and are keyboard-reachable without JavaScript. A generated
 * `ToggleGroup` used to provide the roving tabindex, which SSR emitted as
 * `tabindex="-1"` and removed every filter from the no-JS tab order; the plain
 * `role="group"` wrapper keeps the same layout and accessible group name
 * without a client-only control. The active item carries `aria-current="page"`.
 *
 * The tray renders when EITHER source exists: a set with no tags but dated
 * posts still shows the period filters (and the reset). A `Separator` closes
 * the tray and divides it from the post list below.
 *
 * Labels come from the hydration-safe locale hook, so they re-render in place
 * when the language switcher changes while the first client render stays
 * byte-identical to the server HTML. `href`s are locale-free, so the reset
 * always lands on the single `/blog/` index.
 */

import type { FilterLink } from "@/components/shared/types";
import { Separator } from "@/components/ui/separator";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { blogIndexPath } from "@/lib/domain/posts";
import { cn } from "@/lib/utils";

interface BlogFiltersProps {
  tags?: FilterLink[];
  periods?: FilterLink[];
  className?: string;
}

const FILTER_CLASSES = cn(
  "inline-flex h-9 items-center justify-center gap-1 rounded-full border px-3",
  "text-sm font-medium whitespace-nowrap transition-colors",
  "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

const FILTER_ACTIVE_CLASSES =
  "border-primary bg-primary text-primary-foreground hover:bg-primary/80";

const FILTER_IDLE_CLASSES = cn(
  "border-(--control-border) bg-background text-foreground",
  "hover:border-(--control-border-strong) hover:bg-muted",
);

const GROUP_LABEL_CLASSES =
  "min-w-[4.5rem] font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground uppercase";

interface FilterGroupProps {
  items: FilterLink[];
  label?: string;
  ariaLabel: string;
  kind: "all" | "tag" | "period";
}

/** One link toolbar; active links keep `aria-current` and a pressed data hook. */
function FilterGroup({ items, label, ariaLabel, kind }: FilterGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      {label && <span className={GROUP_LABEL_CLASSES}>{label}</span>}
      <div
        role="group"
        aria-label={ariaLabel}
        className="flex flex-wrap items-center gap-2"
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            data-blog-filter={kind}
            className={cn(
              FILTER_CLASSES,
              item.active ? FILTER_ACTIVE_CLASSES : FILTER_IDLE_CLASSES,
            )}
          >
            <span
              className={
                item.active ? "text-primary-foreground" : "text-foreground"
              }
            >
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function BlogFilters({
  tags = [],
  periods = [],
  className,
}: BlogFiltersProps) {
  const { t } = useHydrationSafeT();

  // The unfiltered index: no tag and no period is active.
  const noneActive =
    !tags.some((item) => item.active) && !periods.some((item) => item.active);

  const allItem: FilterLink = {
    label: t("blog.allPosts"),
    href: blogIndexPath(),
    active: noneActive,
  };

  const showTags = tags.length > 0;
  const showPeriods = periods.length > 0;

  if (!showTags && !showPeriods) return null;

  return (
    <nav
      className={cn("grid gap-(--space-4)", className)}
      aria-label={t("blog.filters")}
      data-blog-filters
    >
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
        <FilterGroup
          items={[allItem]}
          ariaLabel={t("blog.allPosts")}
          kind="all"
        />
        {showTags && (
          <FilterGroup
            items={tags}
            label={t("blog.byTag")}
            ariaLabel={t("blog.byTag")}
            kind="tag"
          />
        )}
        {showPeriods && (
          <FilterGroup
            items={periods}
            label={t("blog.byDate")}
            ariaLabel={t("blog.byDate")}
            kind="period"
          />
        )}
      </div>
      <Separator />
    </nav>
  );
}
