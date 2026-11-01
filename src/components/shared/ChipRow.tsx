/**
 * ChipRow — one wrapping row of chips, composed from the generated shadcn
 * primitives.
 *
 * Two roles, never mixed:
 *  - `variant="tag"`    a label, not a control. A tag with no `href` is a
 *                       `<span>` (Badge); a tag with `href` (the article's
 *                       "tagged" nav) is a quiet `<a>`.
 *  - `variant="filter"` a control. A filter with `href` is an `<a>` carrying
 *                       `aria-current="page"` while active; a filter without
 *                       `href` is a `<button>` with `aria-pressed`.
 *
 * The row renders nothing for an empty `items` array, so a caller can pass a
 * possibly-empty tag list without an empty `<ul>`.
 *
 * Labels stay with the caller: this component never reads the locale or the
 * store, which keeps the MDX page kit static and the React chrome reactive.
 */
import type { ChipItem } from "@/components/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  type Gap,
  GAP_CLASSES,
  INTERACTIVE_TOUCH_CLASSES,
} from "./layout/classes";

export interface ChipRowProps {
  /** Chip entries. `href` makes a filter a link; omit it for a button. */
  items: ChipItem[];
  /** `tag` labels are non-interactive; `filter` items are controls. */
  variant?: "tag" | "filter";
  /** Names the row; needed for filter control groups. */
  ariaLabel?: string;
  /** Gap between chips on the shared spacing scale. Default `2`. */
  gap?: Gap;
  className?: string;
}

const TAG_CLASSES =
  "max-w-full border-border bg-secondary/60 text-muted-foreground";
const TAG_LINK_CLASSES =
  "transition-colors hover:bg-muted hover:text-foreground";
const FILTER_CLASSES = cn("rounded-4xl text-sm", INTERACTIVE_TOUCH_CLASSES);

export default function ChipRow({
  items,
  variant = "tag",
  ariaLabel,
  gap = 2,
  className,
}: ChipRowProps) {
  if (items.length === 0) return null;

  const isFilter = variant === "filter";

  return (
    <ul
      className={cn(
        "m-0 flex list-none flex-wrap items-center p-0",
        GAP_CLASSES[gap],
        className,
      )}
      aria-label={ariaLabel}
      data-slot="chip-row"
      data-variant={variant}
    >
      {items.map((item) => (
        <li key={item.label}>
          {isFilter ? (
            item.href ? (
              <Button
                variant={item.active ? "default" : "outline"}
                size="sm"
                className={FILTER_CLASSES}
                aria-current={item.active ? "page" : undefined}
                render={<a href={item.href}>{item.label}</a>}
              />
            ) : (
              <Button
                type="button"
                variant={item.active ? "default" : "outline"}
                size="sm"
                className={FILTER_CLASSES}
                aria-pressed={item.active ?? false}
              >
                {item.label}
              </Button>
            )
          ) : item.href ? (
            <Badge
              variant="outline"
              className={cn(TAG_CLASSES, TAG_LINK_CLASSES)}
              render={<a href={item.href}>{item.label}</a>}
            />
          ) : (
            <Badge variant="outline" className={TAG_CLASSES}>
              {item.label}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
