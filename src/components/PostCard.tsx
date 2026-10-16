/**
 * PostCard — a blog post, in one of two interchangeable layouts.
 *
 * Props
 *  - href: string
 *  - title: string
 *  - description: string
 *  - dateLabel?: string      human date, already localised
 *  - datetime?: string       machine ISO date for <time datetime>
 *  - readingTime?: string    localised, e.g. "約 3 分鐘閱讀"
 *  - tags?: string[]
 *  - headingLevel?: 2 | 3    default: 2 (page title is the h1); row variant only
 *  - variant?: "card" | "row"   default: "card"
 *      card → a stacked card surface in a grid
 *      row  → a wide horizontal entry with a fixed mono meta rail
 *  - className?: string
 *
 * Both variants wrap the shared `Card`, so they inherit the glass surface and
 * the interactive hover lift. Tags are NON-interactive labels (`ChipRow`
 * default `variant="tag"`), distinct from the filter controls above a list.
 */
import Card from "./Card";
import Cluster from "./layout/Cluster";
import Stack from "./layout/Stack";
import Heading from "./ui/Heading";
import Text from "./ui/Text";
import ChipRow from "./ChipRow";

interface PostCardProps {
  href: string;
  title: string;
  description: string;
  dateLabel?: string;
  datetime?: string;
  readingTime?: string;
  tags?: string[];
  headingLevel?: 2 | 3;
  variant?: "card" | "row";
  className?: string;
}

export default function PostCard({
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
}: PostCardProps) {
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
