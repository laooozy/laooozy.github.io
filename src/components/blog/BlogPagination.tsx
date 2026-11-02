/**
 * BlogPagination — prev/next controls for a paginated listing.
 *
 * Composed from the generated shadcn `Pagination` family. Prev/next are REAL
 * anchors styled with `buttonVariants`; the unavailable direction is a non-
 * interactive span that keeps the bar's geometry stable. The page status is the
 * visible middle label and the nav's `aria-label` is the localised "Blog
 * pagination" string.
 *
 * Labels come from the hydration-safe locale hook, so they re-render in place
 * when the language switcher changes while the first client render stays
 * byte-identical to the server HTML. `href`s are locale-free.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Pagination as PaginationState } from "@/components/shared/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { cn } from "@/lib/utils";

interface BlogPaginationProps {
  pagination: PaginationState;
  className?: string;
}

const TOUCH_TARGET = "pointer-coarse:min-h-11 pointer-coarse:min-w-11";

const STEP_CLASSES = cn(
  buttonVariants({ variant: "ghost", size: "default" }),
  TOUCH_TARGET,
);

/** The unavailable direction: a muted, non-focusable stub. */
function DisabledStep({
  label,
  side,
}: {
  label: string;
  side: "prev" | "next";
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground opacity-50"
    >
      {side === "prev" && <ChevronLeft aria-hidden="true" />}
      <span className="hidden sm:block">{label}</span>
      {side === "next" && <ChevronRight aria-hidden="true" />}
    </span>
  );
}

/** A native link step; `aria-label` supplies the name, so icons are hidden. */
function StepLink({
  href,
  rel,
  label,
  side,
  className,
}: {
  href: string;
  rel: "prev" | "next";
  label: string;
  side: "prev" | "next";
  className: string;
}) {
  return (
    <a
      href={href}
      rel={rel}
      aria-label={label}
      data-slot="pagination-link"
      className={className}
    >
      {side === "prev" && (
        <ChevronLeft aria-hidden="true" data-icon="inline-start" />
      )}
      <span className="hidden sm:block">{label}</span>
      {side === "next" && (
        <ChevronRight aria-hidden="true" data-icon="inline-end" />
      )}
    </a>
  );
}

export default function BlogPagination({
  pagination,
  className,
}: BlogPaginationProps) {
  const { t } = useHydrationSafeT();
  const status = t("blog.pageOf", {
    current: pagination.currentPage,
    last: pagination.lastPage,
  });

  return (
    <Pagination
      data-blog-pagination
      aria-label={t("blog.pagination")}
      className={["mt-(--space-6)", className].filter(Boolean).join(" ")}
    >
      <PaginationContent className="w-full flex-wrap justify-between gap-2">
        <PaginationItem>
          {pagination.url.prev ? (
            <StepLink
              href={pagination.url.prev}
              rel="prev"
              side="prev"
              label={t("blog.prev")}
              className={cn(STEP_CLASSES, "pl-1.5!")}
            />
          ) : (
            <DisabledStep label={t("blog.prev")} side="prev" />
          )}
        </PaginationItem>

        <PaginationItem>
          <span className="px-2 text-center font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground">
            {status}
          </span>
        </PaginationItem>

        <PaginationItem>
          {pagination.url.next ? (
            <StepLink
              href={pagination.url.next}
              rel="next"
              side="next"
              label={t("blog.next")}
              className={cn(STEP_CLASSES, "pr-1.5!")}
            />
          ) : (
            <DisabledStep label={t("blog.next")} side="next" />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
