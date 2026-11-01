import { cn } from "@/lib/utils";

import {
  COLUMN_CLASSES,
  type Columns,
  type Gap,
  GAP_CLASSES,
  GRID_MIN_CLASSES,
  type GridMin,
} from "./classes";
import type { LayoutProps, LayoutTag } from "./types";
import { useLayoutElement } from "./use-layout-element";

export interface GridOwnProps {
  /**
   * Minimum card width for the fluid auto-fit track. Default `16rem`.
   * Ignored when `columns` is set.
   */
  min?: GridMin;
  /** Gap between cells on the shared spacing scale. Default `5`. */
  gap?: Gap;
  /** Force an exact column count instead of the auto-fit track. */
  columns?: Columns;
  /**
   * Rendered item count, exposed as `data-count` for the `.grid--cards`
   * card-row recipes (LatestPosts and the home About grid).
   */
  count?: number;
}

export type GridProps<Tag extends LayoutTag = "div"> = LayoutProps<Tag> &
  GridOwnProps;

/**
 * Grid — responsive two-dimensional flow.
 *
 * Without `columns`, the grid auto-fits as many `min`-wide tracks as fit and
 * reflows with no breakpoints, so it degrades to one column at 320px. Use
 * Cluster for a single wrapping row.
 */
export default function Grid<Tag extends LayoutTag = "div">({
  min = "16rem",
  gap = 5,
  columns,
  count,
  as,
  render,
  className,
  children,
  ...props
}: GridProps<Tag>) {
  const tag = (as ?? "div") as LayoutTag;
  const template = columns ? COLUMN_CLASSES[columns] : GRID_MIN_CLASSES[min];

  return useLayoutElement({
    as: tag,
    baseClassName: cn("grid", GAP_CLASSES[gap], template),
    className,
    children,
    props: {
      ...props,
      ...(count === undefined ? {} : { "data-count": count }),
    } as Record<string, unknown>,
    render,
    state: { layout: "grid", gap, columns, min },
  });
}
