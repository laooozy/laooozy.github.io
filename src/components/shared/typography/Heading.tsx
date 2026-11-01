import type { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { LayoutTag } from "../layout/types";
import { useLayoutElement } from "../layout/use-layout-element";
import {
  type HeadingLevel,
  type HeadingSize,
  headingVariants,
  type TypographyTone,
} from "./variants";

const LEVEL_TAGS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
} as const satisfies Record<HeadingLevel, LayoutTag>;

export interface HeadingProps extends Omit<
  ComponentPropsWithRef<"h1">,
  "as" | "render" | "className" | "children"
> {
  /** Semantic level: renders the matching `<hN>` and sets its base size. */
  level?: HeadingLevel;
  /** Optional display-scale override (`hero` for mastheads). */
  size?: HeadingSize;
  tone?: TypographyTone;
  /** Element override; defaults to the tag implied by `level`. */
  as?: LayoutTag;
  /** Base UI-style replacement element. `asChild` is NOT supported. */
  render?: useRender.RenderProp;
  className?: string;
  children?: ReactNode;
}

/**
 * Heading — a semantic heading on the brand display type scale.
 *
 * `level` sets the element and its default size; `size` is for the few places
 * that need to break the scale (a hero wordmark) without changing semantics.
 */
export default function Heading({
  level = 2,
  size,
  tone = "default",
  as,
  render,
  className,
  children,
  ...props
}: HeadingProps) {
  const tag = (as ?? LEVEL_TAGS[level]) as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(
      headingVariants({ level, size, tone }),
      // Appended after the font-size variant: tailwind-merge treats a
      // `text-*` size as also owning line-height, so it would drop
      // `leading-tight` from the CVA base otherwise.
      "leading-tight",
    ),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { typography: "heading", level, size: size ?? null, tone },
  });
}
