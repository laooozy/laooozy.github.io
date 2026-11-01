/**
 * PostCardView — the pure, hook-free post-card markup.
 *
 * This is the SINGLE source of the card and row markup. The hydrated React
 * wrapper (`PostCard.tsx`) computes the locale-dependent labels and delegates
 * here, and the build-time `mdx/LatestPosts.astro` renders the same component
 * directly (server-only, no hydration). Keep the markup and class names here;
 * never duplicate them in a consumer.
 *
 * Every label is a plain string prop so this stays a pure presentational
 * component: no hooks, no store, no adapters.
 */
import Card from "@/components/shared/Card";
import ChipRow from "@/components/shared/ChipRow";
import Cluster from "@/components/shared/layout/Cluster";
import Stack from "@/components/shared/layout/Stack";
import Heading from "@/components/shared/typography/Heading";
import Text from "@/components/shared/typography/Text";

export interface PostCardViewProps {
  href: string;
  title: string;
  description: string;
  /** Already-formatted calendar day, e.g. `2026年10月20日`. */
  dateLabel?: string;
  /** Date-only `YYYY-MM-DD` for `<time datetime>`. */
  datetime?: string;
  /** Already-formatted reading-time label, e.g. `約 3 分鐘閱讀`. */
  readingTime?: string;
  tags?: string[];
  headingLevel?: 2 | 3;
  variant?: "card" | "row";
  className?: string;
}

export default function PostCardView({
  href,
  title,
  description,
  dateLabel,
  datetime,
  readingTime,
  tags = [],
  headingLevel = 2,
  variant = "card",
  className,
}: PostCardViewProps) {
  if (variant === "row") {
    return (
      <Card
        href={href}
        className={["post-row", className].filter(Boolean).join(" ")}
      >
        <div className="post-row__inner">
          <div className="post-row__rail">
            <time className="post-row__date" dateTime={datetime}>
              {dateLabel}
            </time>
            {readingTime && (
              <span className="post-row__reading">{readingTime}</span>
            )}
          </div>
          <div className="post-row__main">
            <Heading level={headingLevel} size="lg" className="post-row__title">
              {title}
            </Heading>
            <Text tone="muted" className="post-row__desc">
              {description}
            </Text>
            {tags.length > 0 && (
              <ChipRow
                className="post-row__tags"
                gap={2}
                items={tags.map((label) => ({ label }))}
              />
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      href={href}
      className={["post-card", className].filter(Boolean).join(" ")}
    >
      <Stack gap={3}>
        {(dateLabel || readingTime) && (
          <Cluster justify="between" gap={3} align="baseline">
            {dateLabel && (
              <time className="post-card__date" dateTime={datetime}>
                {dateLabel}
              </time>
            )}
            {readingTime && (
              <Text as="span" size="xs" tone="muted">
                {readingTime}
              </Text>
            )}
          </Cluster>
        )}
        <h3 className="post-card__title">{title}</h3>
        <Text tone="muted">{description}</Text>
        {tags.length > 0 && (
          <ChipRow items={tags.map((label) => ({ label }))} />
        )}
      </Stack>
    </Card>
  );
}
