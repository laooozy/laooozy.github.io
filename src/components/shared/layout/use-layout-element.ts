import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { LayoutTag } from "./types";

interface UseLayoutElementOptions {
  as: LayoutTag;
  baseClassName: string;
  className?: string;
  children?: ReactNode;
  props: Record<string, unknown>;
  render?: useRender.RenderProp;
  state: Record<string, unknown>;
}

/**
 * One render path for every layout primitive: a typed `as` tag, a Base UI
 * `render` escape hatch, and static classes merged last so a caller's
 * `className` can override the primitive's own utilities.
 */
export function useLayoutElement({
  as,
  baseClassName,
  className,
  children,
  props,
  render,
  state,
}: UseLayoutElementOptions) {
  return useRender({
    defaultTagName: as,
    render,
    props: {
      ...props,
      className: cn(baseClassName, className),
      children,
    },
    state,
  });
}

/** True when the primitive itself is the interactive control. */
export function isInteractiveTag(
  as: LayoutTag,
  interactive: boolean | undefined,
): boolean {
  return interactive ?? (as === "a" || as === "button");
}
