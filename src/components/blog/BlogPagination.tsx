/**
 * BlogPagination — prev/next controls for a paginated listing.
 *
 * Composed from the generated shadcn `Pagination` family. Prev/next are real
 * links when the direction exists; the unavailable direction is a non-
 * interactive span that keeps the bar's geometry stable. The page status is the
 * visible middle label and the nav's `aria-label` is the localised "Blog
 * pagination" string.
 *
 * Labels come from `useT`, bound to the store's active locale, so they re-render
 * in place when the language switcher changes (mounted gate, mirroring the
 * hydrated chrome). `href`s are locale-free.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import type { Pagination as PaginationState } from "@/components/shared/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface BlogPaginationProps {
  pagination: PaginationState;
  className?: string;
}

const TOUCH_TARGET = "pointer-coarse:min-h-11 pointer-coarse:min-w-11";

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

export default function BlogPagination({
  pagination,
  className,
}: BlogPaginationProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  const status = tr("blog.pageOf", {
    current: pagination.currentPage,
    last: pagination.lastPage,
  });

  return (
    <Pagination
      data-blog-pagination
      aria-label={tr("blog.pagination")}
      className={["mt-(--space-6)", className].filter(Boolean).join(" ")}
    >
      <PaginationContent className="w-full flex-wrap justify-between gap-2">
        <PaginationItem>
          {pagination.url.prev ? (
            <PaginationPrevious
              href={pagination.url.prev}
              rel="prev"
              text={tr("blog.prev")}
              aria-label={tr("blog.prev")}
              className={TOUCH_TARGET}
            />
          ) : (
            <DisabledStep label={tr("blog.prev")} side="prev" />
          )}
        </PaginationItem>

        <PaginationItem>
          <span className="px-2 text-center font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground">
            {status}
          </span>
        </PaginationItem>

        <PaginationItem>
          {pagination.url.next ? (
            <PaginationNext
              href={pagination.url.next}
              rel="next"
              text={tr("blog.next")}
              aria-label={tr("blog.next")}
              className={TOUCH_TARGET}
            />
          ) : (
            <DisabledStep label={tr("blog.next")} side="next" />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
