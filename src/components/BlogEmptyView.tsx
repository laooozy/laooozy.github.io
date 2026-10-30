/**
 * BlogEmptyView — the pure, hook-free zero-post panel.
 *
 * This is the SINGLE source of the empty-state markup. The hydrated React
 * wrapper (`BlogEmpty.tsx`) supplies the locale-reactive labels, and the
 * build-time `mdx/LatestPosts.astro` renders it directly with the default-locale
 * labels (server-only, no hydration). Keep the markup and class names here;
 * never duplicate them in a consumer.
 *
 * Every label is a plain string prop so this stays purely presentational: no
 * hooks, no store, no adapters.
 */
import Card from "@/components/Card";
import Cluster from "@/components/layout/Cluster";
import Stack from "@/components/layout/Stack";
import Heading from "@/components/ui/Heading";
import Text from "@/components/ui/Text";

export interface BlogEmptyViewProps {
  /** Panel heading, e.g. `Blog`. */
  heading: string;
  /** One-line explanation, e.g. `No posts yet.` */
  message: string;
  /** Home action label. */
  homeLabel: string;
  /** ACG action label. */
  acgLabel: string;
  className?: string;
}

export default function BlogEmptyView({
  heading,
  message,
  homeLabel,
  acgLabel,
  className,
}: BlogEmptyViewProps) {
  return (
    <Card className={["blog-empty", className].filter(Boolean).join(" ")}>
      <Stack gap={4}>
        <Stack gap={2}>
          <Heading level={2} className="blog-empty__title">
            {heading}
          </Heading>
          <Text tone="muted">{message}</Text>
        </Stack>
        <Cluster gap={2} className="blog-empty__actions">
          <a className="link-arrow blog-empty__action" href="/">
            {homeLabel}
            <span className="link-arrow__arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="link-arrow blog-empty__action" href="/acg/">
            {acgLabel}
            <span className="link-arrow__arrow" aria-hidden="true">
              →
            </span>
          </a>
        </Cluster>
      </Stack>
    </Card>
  );
}
