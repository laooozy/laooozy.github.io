import type { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { LayoutTag } from "../layout/types";
import { useLayoutElement } from "../layout/use-layout-element";
import {
  type TextMeasure,
  type TextSize,
  textVariants,
  type TypographyTone,
} from "./variants";

export interface TextProps extends Omit<
  ComponentPropsWithRef<"p">,
  "as" | "render" | "className" | "children"
> {
  /** Element tag, default `p`. */
  as?: LayoutTag;
  /** Base UI-style replacement element. `asChild` is NOT supported. */
  render?: useRender.RenderProp;
  size?: TextSize;
  tone?: TypographyTone;
  /** Cap the line length at the brand `--measure` (~68ch). */
  measure?: TextMeasure;
  className?: string;
  children?: ReactNode;
}

/**
 * Text — body/label copy on the brand type scale.
 *
 * Sizes and tone are classes, never inline styles, so every instance shares
 * one scale and the generated stylesheet carries the full set.
 */
export default function Text({
  as,
  size = "base",
  tone = "default",
  measure = false,
  render,
  className,
  children,
  ...props
}: TextProps) {
  const tag = (as ?? "p") as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(textVariants({ size, tone, measure })),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { typography: "text", size, tone, measure },
  });
}
