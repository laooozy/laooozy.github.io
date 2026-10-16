/**
 * BlogPagination — build-time prev/next controls for a paginated listing.
 *
 * Renders nothing when there is only one page. Prev/next are control-style
 * links (the same outlined pill language as the filter chips); the unavailable
 * direction is a non-interactive, `aria-hidden` stub so the layout never jumps.
 * The `aria-label` on the nav is the localised "Page N of M" string, which
 * doubles as the visible status in the middle of the bar.
 */
import { useTranslations, type Locale } from "../i18n/ui";
import type { Pagination } from "./types";

interface BlogPaginationProps {
  locale: Locale;
  pagination: Pagination;
  className?: string;
}

export default function BlogPagination({
  locale,
  pagination,
  className,
}: BlogPaginationProps) {
  const t = useTranslations(locale);
  const status = t.blog.pageOf
    .replace("{current}", String(pagination.currentPage))
    .replace("{last}", String(pagination.lastPage));

  return (
    <nav
      className={["pagination", className].filter(Boolean).join(" ")}
      aria-label={status}
    >
      {pagination.url.prev ? (
        <a className="pagination__link" href={pagination.url.prev} rel="prev">
          <span aria-hidden="true">←</span>
          {t.blog.prev}
        </a>
      ) : (
        <span className="pagination__link is-disabled" aria-hidden="true">
          <span aria-hidden="true">←</span>
          {t.blog.prev}
        </span>
      )}

      <span className="pagination__status">{status}</span>

      {pagination.url.next ? (
        <a className="pagination__link" href={pagination.url.next} rel="next">
          {t.blog.next}
          <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span className="pagination__link is-disabled" aria-hidden="true">
          {t.blog.next}
          <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
