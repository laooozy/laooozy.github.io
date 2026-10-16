/**
 * PostCard — a blog post, in one of two interchangeable layouts.
 *
 * Props
 *  - href: string
 *  - title: string
 *  - description: string
 *  - date?: string           build-local calendar day `YYYY-MM-DD`
 *  - datetime?: string       full ISO-8601 instant for <time datetime>
 *  - readingMinutes?: number estimated whole minutes (locale-independent)
 *  - tags?: string[]
 *  - headingLevel?: 2 | 3    default: 2 (page title is the h1); row variant only
 *  - variant?: "card" | "row"   default: "card"
 *      card → a stacked card surface in a grid
 *      row  → a wide horizontal entry with a fixed mono meta rail
 *  - className?: string
 *
 * The date and reading-time labels are formatted CLIENT-side from the store
 * locale (mounted gate, mirroring `HomePage`), so they re-render in place when
 * the language switcher changes. Both variants wrap the shared `Card`, so they
 * inherit the glass surface and the interactive hover lift. Tags are
 * NON-interactive labels (`ChipRow` default `variant="tag"`), distinct from the
 * filter controls above a list.
 */
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import ChipRow from "@/components/ChipRow";
import Card from "@/components/Card";
import Cluster from "@/components/layout/Cluster";
import Stack from "@/components/layout/Stack";
import Heading from "@/components/ui/Heading";
import Text from "@/components/ui/Text";
import { useLocale } from "@/hooks/useLocale";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { formatPostDate } from "@/lib/domain/posts";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface PostCardProps {
  href: string;
  title: string;
  description: string;
  date?: string;
  datetime?: string;
  readingMinutes?: number;
  tags?: string[];
  headingLevel?: 2 | 3;
  variant?: "card" | "row";
  className?: string;
}

export default function PostCard({
  href,
  title,
  description,
  date,
  datetime,
  readingMinutes,
  tags = [],
  headingLevel = 2,
  variant = "card",
  className,
}: PostCardProps) {
  const t = useT(clientDeps);
  const { locale } = useLocale(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  const activeLocale = mounted ? locale : defaultLang;

  const dateLabel = date
    ? formatPostDate(new Date(`${date}T00:00:00`), activeLocale)
    : undefined;
  const readingTime =
    readingMinutes === undefined
      ? undefined
      : tr("blog.readTime", { minutes: readingMinutes });

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
