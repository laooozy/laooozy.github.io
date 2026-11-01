/**
 * PostCardView — the pure, hook-free post-card markup.
 *
 * This is the SINGLE source of the card and row markup. The hydrated React
 * wrapper (`PostCard.tsx`) computes the locale-dependent labels and delegates
 * here, and the build-time `mdx/LatestPosts.astro` renders the same component
 * directly (server-only, no hydration). Keep the markup and class names here;
 * never duplicate them in a consumer.
 *
 * Composition is the generated shadcn `Card` family plus `Button` (the card's
 * one action) and `ChipRow` (non-interactive tag badges). `headingLevel`
 * defaults to 3 on the card variant (it sits under a section h2) and 2 on the
 * row variant (the listing page owns the h1).
 *
 * Every label is a plain string prop so this stays a pure presentational
 * component: no hooks, no store, no adapters.
 */
import { ArrowRight } from "lucide-react";

import ChipRow from "@/components/shared/ChipRow";
import Heading from "@/components/shared/typography/Heading";
import Text from "@/components/shared/typography/Text";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  /** The card action's visible label, e.g. `閱讀文章`. */
  readLabel: string;
  tags?: string[];
  /** Heading level; defaults to 3 for the card variant and 2 for the row. */
  headingLevel?: 2 | 3;
  variant?: "card" | "row";
  className?: string;
}

/** A stable id for the title, used as the action link's description. */
function titleIdFor(href: string): string {
  const slug = href.replace(/^\/blog\//u, "").replace(/\/$/u, "") || "post";
  return `post-title-${slug.replace(/[^a-zA-Z0-9_-]+/gu, "-")}`;
}

export default function PostCardView({
  href,
  title,
  description,
  dateLabel,
  datetime,
  readingTime,
  readLabel,
  tags = [],
  headingLevel,
  variant = "card",
  className,
}: PostCardViewProps) {
  const isRow = variant === "row";
  const level = headingLevel ?? (isRow ? 2 : 3);
  const titleId = titleIdFor(href);
  const hasMeta = Boolean(dateLabel || readingTime);

  return (
    <Card
      data-post-card
      data-variant={variant}
      className={cn(
        "h-full transition-shadow focus-within:ring-2 focus-within:ring-ring/50 hover:ring-foreground/20",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "gap-3",
          isRow &&
            "sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-6",
        )}
      >
        {hasMeta && (
          <div
            className={cn(
              "flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground",
              isRow && "sm:flex-col sm:items-start sm:gap-1",
            )}
          >
            {dateLabel && <time dateTime={datetime}>{dateLabel}</time>}
            {readingTime && (
              <span>
                {dateLabel && (
                  <span aria-hidden="true" className="mr-3">
                    ·
                  </span>
                )}
                {readingTime}
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 space-y-2">
          <Heading
            id={titleId}
            level={level}
            size={isRow ? "lg" : "md"}
            className="cjk-label"
          >
            {title}
          </Heading>
          <Text size="sm" tone="muted" className="cjk-label">
            {description}
          </Text>
          {tags.length > 0 && (
            <ChipRow
              className="pt-1"
              gap={2}
              items={tags.map((label) => ({ label }))}
            />
          )}
        </div>
      </CardHeader>

      <CardFooter className="justify-end">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 rounded-full px-4"
          render={
            <a href={href} aria-describedby={titleId}>
              {readLabel}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </a>
          }
        />
      </CardFooter>
    </Card>
  );
}
