import { Children, type ReactNode } from "react";

/**
 * True when the node tree has anything the visitor would actually see.
 *
 * Used by the `hidden="empty"` gate on Section and InterestCard: MDX authors a
 * placeholder body as a comment until the real copy arrives, and an empty
 * section/card must render nothing at all rather than an empty shell. A
 * comment-only body reaches React as `undefined`, an empty array, or
 * whitespace-only strings, all of which count as empty.
 */
export function hasRenderableChildren(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return false;
    }

    if (typeof child === "string") return child.trim() !== "";

    if (Array.isArray(child)) return hasRenderableChildren(child);

    return true;
  });
}
