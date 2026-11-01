/**
 * BlogEmptyView — the pure, hook-free zero-post panel.
 *
 * This is the SINGLE source of the empty-state markup. The hydrated React
 * wrapper (`BlogEmpty.tsx`) supplies the locale-reactive labels, and the
 * build-time `mdx/LatestPosts.astro` renders it directly with the default-locale
 * labels (server-only, no hydration). The panel is the shared `EmptyState`
 * primitive (generated shadcn `Empty`) so every zero-result surface shares one
 * anatomy; keep the copy and links here, never duplicate them in a consumer.
 *
 * Every label is a plain string prop so this stays purely presentational: no
 * hooks, no store, no adapters.
 */
import Cluster from "@/components/shared/layout/Cluster";
import EmptyState from "@/components/shared/state/EmptyState";
import Heading from "@/components/shared/typography/Heading";
import { Button } from "@/components/ui/button";

export interface BlogEmptyViewProps {
  /** Panel heading, e.g. `最新文章`. */
  heading: string;
  /** One-line explanation, e.g. `這裡還沒有文章。` */
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
      data-blog-empty
      className={className}
      title={
        <Heading level={2} className="text-[length:var(--text-xl)]">
          {heading}
        </Heading>
      }
      description={message}
      action={
        <Cluster gap={2} className="flex-wrap justify-center">
          <Button
            size="lg"
            className="min-h-11 rounded-full px-4"
            render={
              <a href="/">
                <span className="text-primary-foreground">{homeLabel}</span>
              </a>
            }
          />
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 rounded-full px-4"
            render={<a href="/photographer/">{secondaryLabel}</a>}
          />
        </Cluster>
      }
    />
  );
}
