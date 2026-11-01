import type { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";

/**
 * The element tags a layout primitive may render. Keeping this a closed union
 * (instead of `keyof JSX.IntrinsicElements`) means the polymorphic props and
 * the Base UI `render` escape hatch are both typed, and a typo is a compile
 * error rather than a silent custom element.
 */
export type LayoutTag =
  | "a"
  | "article"
  | "aside"
  | "button"
  | "div"
  | "dl"
  | "fieldset"
  | "figure"
  | "footer"
  | "form"
  | "header"
  | "li"
  | "main"
  | "nav"
  | "ol"
  | "p"
  | "section"
  | "span"
  | "ul";

export interface LayoutElementProps<Tag extends LayoutTag = "div"> {
  /**
   * The HTML element to render. Defaults to `div`.
   *
   * Use `render` instead when composing with another component (the Base UI
   * convention the shadcn primitives use); `asChild` is NOT supported.
   */
  as?: Tag;
  /** Base UI-style replacement element/function. */
  render?: useRender.RenderProp;
  /**
   * Grow the hit area to the 44px WCAG target under a coarse pointer. Enabled
   * automatically when the primitive itself is an `a` or `button`.
   */
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Props for a layout primitive rendered as `Tag`, including native attributes. */
export type LayoutProps<Tag extends LayoutTag = "div"> = Omit<
  ComponentPropsWithRef<Tag>,
  "as" | "render" | "className" | "children"
> &
  LayoutElementProps<Tag>;
