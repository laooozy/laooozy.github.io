import type { ComponentPropsWithRef, ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<
  ComponentPropsWithRef<"div">,
  "title"
> {
  /** Heading copy; the caller owns the string. */
  title?: ReactNode;
  /** Supporting copy; the caller owns the string. */
  description?: ReactNode;
  /** Optional leading glyph. */
  media?: ReactNode;
  /** `icon` draws the generated muted tile around `media`. */
  mediaVariant?: "default" | "icon";
  /** The primary action, or an action group. */
  action?: ReactNode;
  /** Extra content under the action. */
  children?: ReactNode;
  className?: string;
  /** Appended to the content slot, e.g. for caller-owned action rows. */
  contentClassName?: string;
}

/**
 * EmptyState — the zero-result panel, composed from the generated shadcn
 * `Empty` family.
 *
 * Presentational only: it never reads a locale or the store. Every string is a
 * prop so the React chrome can translate in place while the MDX page kit stays
 * static. The caller may pass a `<Heading>` as `title` when the empty panel
 * needs a semantic heading, and a `<Cluster>` as `action` for a link row.
 */
export default function EmptyState({
  title,
  description,
  media,
  mediaVariant = "default",
  action,
  children,
  className,
  contentClassName,
  ...props
}: EmptyStateProps) {
  const hasContent = action != null || children != null;

  return (
    <Empty
      className={cn("border border-border bg-card/60", className)}
      {...props}
    >
      <EmptyHeader>
        {media ? <EmptyMedia variant={mediaVariant}>{media}</EmptyMedia> : null}
        {title ? <EmptyTitle>{title}</EmptyTitle> : null}
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {hasContent ? (
        <EmptyContent className={contentClassName}>
          {action}
          {children}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
