import { cn } from "@/lib/utils";

import {
  type Gap,
  GAP_CLASSES,
  INTERACTIVE_TOUCH_CLASSES,
  STACK_ALIGN_CLASSES,
  type StackAlign,
} from "./classes";
import type { LayoutProps, LayoutTag } from "./types";
import { isInteractiveTag, useLayoutElement } from "./use-layout-element";

export interface StackOwnProps {
  /** Vertical rhythm step on the shared spacing scale. Default `4`. */
  gap?: Gap;
  /** Cross-axis alignment. Default `stretch`. */
  align?: StackAlign;
}

export type StackProps<Tag extends LayoutTag = "div"> = LayoutProps<Tag> &
  StackOwnProps;

/**
 * Stack — one-dimensional vertical flow.
 *
 * `<Stack gap={4}>` is the default page/card rhythm. Cards, section bodies and
 * prose lists own their spacing here instead of with margins. Pass `as="ul"`
 * for a list, or `render={<a />}` when composing with another component.
 */
export default function Stack<Tag extends LayoutTag = "div">({
  gap = 4,
  align = "stretch",
  as,
  interactive,
  render,
  className,
  children,
  ...props
}: StackProps<Tag>) {
  const tag = (as ?? "div") as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(
      "stack flex flex-col",
      GAP_CLASSES[gap],
      STACK_ALIGN_CLASSES[align],
      isInteractiveTag(tag, interactive) && INTERACTIVE_TOUCH_CLASSES,
    ),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { layout: "stack", gap, align },
  });
}
