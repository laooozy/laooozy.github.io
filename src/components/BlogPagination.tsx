/**
 * BlogPagination — prev/next controls for a paginated listing.
 *
 * Renders nothing when there is only one page. Prev/next are control-style
 * links (the same outlined pill language as the filter chips); the unavailable
 * direction is a non-interactive, `aria-hidden` stub so the layout never jumps.
 * The `aria-label` on the nav is the localised "Page N of M" string, which
 * doubles as the visible status in the middle of the bar.
 *
 * Labels come from `useT`, bound to the store's active locale, so they re-render
 * in place when the language switcher changes (mounted gate, mirroring
 * `HomePage`). `href`s are locale-free.
 */
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import type { Pagination } from "@/components/types";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface BlogPaginationProps {
  pagination: Pagination;
  className?: string;
}

export default function BlogPagination({
  pagination,
  className,
}: BlogPaginationProps) {
  const t = useT(clientDeps);
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
    <nav
      className={["pagination", className].filter(Boolean).join(" ")}
      aria-label={status}
    >
      {pagination.url.prev ? (
        <a className="pagination__link" href={pagination.url.prev} rel="prev">
          <span aria-hidden="true">←</span>
          {tr("blog.prev")}
        </a>
      ) : (
        <span className="pagination__link is-disabled" aria-hidden="true">
          <span aria-hidden="true">←</span>
          {tr("blog.prev")}
        </span>
      )}

      <span className="pagination__status">{status}</span>

      {pagination.url.next ? (
        <a className="pagination__link" href={pagination.url.next} rel="next">
          {tr("blog.next")}
          <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span className="pagination__link is-disabled" aria-hidden="true">
          {tr("blog.next")}
          <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
