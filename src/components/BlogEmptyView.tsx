/**
 * BlogEmptyView — the pure, hook-free zero-post panel.
 *
 * This is the SINGLE source of the empty-state markup. The hydrated React
 * wrapper (`BlogEmpty.tsx`) supplies the locale-reactive labels, and the
 * build-time `mdx/LatestPosts.astro` renders it directly with the default-locale
 * labels (server-only, no hydration). The panel is the shared `EmptyState`
 * primitive so every zero-result surface shares one anatomy; keep the copy and
 * links here, never duplicate them in a consumer.
 *
 * Every label is a plain string prop so this stays purely presentational: no
 * hooks, no store, no adapters.
 */
import Cluster from "@/components/layout/Cluster";
import EmptyState from "@/components/shared/state/EmptyState";
import Heading from "@/components/shared/typography/Heading";

export interface BlogEmptyViewProps {
  /** Panel heading, e.g. `Blog`. */
  heading: string;
  /** One-line explanation, e.g. `No posts yet.` */
  message: string;
  /** Home action label. */
  homeLabel: string;
  /** Photography action label. */
  secondaryLabel: string;
  className?: string;
}

export default function BlogEmptyView({
  heading,
  message,
  homeLabel,
  secondaryLabel,
  className,
}: BlogEmptyViewProps) {
  return (
    <EmptyState
      className={["blog-empty", className].filter(Boolean).join(" ")}
      title={
        <Heading level={2} className="blog-empty__title">
          {heading}
        </Heading>
      }
      description={message}
      contentClassName="blog-empty__content"
      action={
        <Cluster gap={2} className="blog-empty__actions">
          <a className="link-arrow blog-empty__action" href="/">
            {homeLabel}
            <span className="link-arrow__arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="link-arrow blog-empty__action" href="/photographer/">
            {secondaryLabel}
            <span className="link-arrow__arrow" aria-hidden="true">
              →
            </span>
          </a>
        </Cluster>
      }
    />
  );
}
