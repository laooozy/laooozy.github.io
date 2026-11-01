import { cn } from "@/lib/utils";

import {
  CLUSTER_ALIGN_CLASSES,
  type ClusterAlign,
  type Gap,
  GAP_CLASSES,
  INTERACTIVE_TOUCH_CLASSES,
  type Justify,
  JUSTIFY_CLASSES,
} from "./classes";
import type { LayoutProps, LayoutTag } from "./types";
import { isInteractiveTag, useLayoutElement } from "./use-layout-element";

export interface ClusterOwnProps {
  /** Gap between items on the shared spacing scale. Default `3`. */
  gap?: Gap;
  /** Cross-axis alignment. Default `center`. */
  align?: ClusterAlign;
  /** Main-axis distribution. Default `start`. */
  justify?: Justify;
}

export type ClusterProps<Tag extends LayoutTag = "div"> = LayoutProps<Tag> &
  ClusterOwnProps;

/**
 * Cluster — one wrapping horizontal row.
 *
 * Ideal for tag rails, meta rows and a heading beside its action. Reach for
 * Grid when the layout is a true two-dimensional collection.
 */
export default function Cluster<Tag extends LayoutTag = "div">({
  gap = 3,
  align = "center",
  justify = "start",
  as,
  interactive,
  render,
  className,
  children,
  ...props
}: ClusterProps<Tag>) {
  const tag = (as ?? "div") as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(
      "cluster flex flex-wrap",
      GAP_CLASSES[gap],
      CLUSTER_ALIGN_CLASSES[align],
      JUSTIFY_CLASSES[justify],
      isInteractiveTag(tag, interactive) && INTERACTIVE_TOUCH_CLASSES,
    ),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { layout: "cluster", gap, align, justify },
  });
}
