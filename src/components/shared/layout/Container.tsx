import { cn } from "@/lib/utils";

import {
  CONTAINER_SIZE_CLASSES,
  type ContainerSize,
  INTERACTIVE_TOUCH_CLASSES,
} from "./classes";
import type { LayoutProps, LayoutTag } from "./types";
import { isInteractiveTag, useLayoutElement } from "./use-layout-element";

export interface ContainerOwnProps {
  /**
   * Content-column cap. `default` is the 72rem page column, `narrow` the
   * 46rem prose wall, `wide` the 84rem full-bleed grid.
   */
  size?: ContainerSize;
}

export type ContainerProps<Tag extends LayoutTag = "div"> = LayoutProps<Tag> &
  ContainerOwnProps;

/**
 * Container — the centred content column and its horizontal gutter.
 *
 * `BaseLayout` wraps `<main>` in it, so page content must NOT nest a second
 * Container: that doubles the gutter. The gutter is the same fluid
 * `clamp(1rem, 4vw, 2rem)` the old CSS recipe used.
 */
export default function Container<Tag extends LayoutTag = "div">({
  size = "default",
  as,
  interactive,
  render,
  className,
  children,
  ...props
}: ContainerProps<Tag>) {
  const tag = (as ?? "div") as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(
      "mx-auto w-full px-[clamp(var(--space-4),4vw,var(--space-6))]",
      CONTAINER_SIZE_CLASSES[size],
      isInteractiveTag(tag, interactive) && INTERACTIVE_TOUCH_CLASSES,
    ),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { layout: "container", size },
  });
}
