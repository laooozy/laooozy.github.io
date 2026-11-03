import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { hasRenderableChildren } from "./compositions/utils";
import Stack from "./layout/Stack";
import Heading from "./typography/Heading";

export interface InterestCardProps {
  /** Card modifier: `photography` renders `interest--photography`. */
  id?: string;
  /** The card label, rendered as an `<h3>` (identity, not a section head). */
  title: string;
  /** `true` renders nothing; `"empty"` renders nothing without body content. */
  hidden?: boolean | "empty";
  className?: string;
  children?: ReactNode;
}

/**
 * InterestCard — one About-grid card.
 *
 * `title` is the card's identity; the body stays authored Markdown passed
 * through the default slot. Cards compose the shared `Card` surface class and
 * a `Stack` body so every About card shares one rhythm.
 */
export default function InterestCard({
  id,
  title,
  hidden = false,
  className,
  children,
}: InterestCardProps) {
  if (hidden === true) return null;
  if (hidden === "empty" && !hasRenderableChildren(children)) return null;

  return (
    <div
      className={cn(
        "interest card-surface",
        id ? `interest--${id}` : undefined,
        className,
      )}
    >
      <Heading
        level={3}
        className="interest__label mb-[var(--space-2)] text-[length:var(--text-lg)]"
      >
        {title}
      </Heading>
      <Stack
        gap={3}
        className={cn(
          "[&>ol]:m-0 [&>p]:m-0 [&>p]:text-[var(--text-muted)] [&>p:has(+ul)]:text-[length:var(--text-sm)] [&>ul:not([data-slot=chip-row])]:m-0 [&>ul:not([data-slot=chip-row])]:grid [&>ul:not([data-slot=chip-row])]:list-none [&>ul:not([data-slot=chip-row])]:gap-[var(--space-1)] [&>ul>li]:text-[length:var(--text-sm)] [&>ul>li]:text-[var(--text-muted)]",
          id === "runner" && "[&>p]:text-[length:var(--text-sm)]",
        )}
      >
        {children}
      </Stack>
    </div>
  );
}
