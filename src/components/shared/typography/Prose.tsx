import type { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { LayoutTag } from "../layout/types";
import { useLayoutElement } from "../layout/use-layout-element";
import { proseClasses } from "./variants";

export interface ProseProps extends Omit<
  ComponentPropsWithRef<"div">,
  "as" | "render" | "className" | "children"
> {
  /** Element tag, default `div`. */
  as?: LayoutTag;
  /** Base UI-style replacement element. `asChild` is NOT supported. */
  render?: useRender.RenderProp;
  className?: string;
  children?: ReactNode;
}

/**
 * Prose — the brand article-body type system for React contexts.
 *
 * The shipped Markdown bodies stay Astro-rendered; this wrapper exists for
 * React surfaces that need the same `prose-brand` rhythm.
 */
export default function Prose({
  as,
  render,
  className,
  children,
  ...props
}: ProseProps) {
  const tag = (as ?? "div") as LayoutTag;

  return useLayoutElement({
    as: tag,
    baseClassName: cn(proseClasses),
    className,
    children,
    props: props as Record<string, unknown>,
    render,
    state: { typography: "prose" },
  });
}
