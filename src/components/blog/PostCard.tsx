/**
 * PostCard — a blog post, in one of two interchangeable layouts.
 *
 * Props
 *  - href: string
 *  - title: string
 *  - description: string
 *  - date?: string           filename calendar day `YYYY-MM-DD`; also the
 *                            `<time datetime>` value
 *  - readingMinutes?: number estimated whole minutes (locale-independent)
 *  - tags?: string[]
 *  - headingLevel?: 2 | 3    default: 3 on the card variant, 2 on the row
 *  - variant?: "card" | "row"   default: "card"
 *      card → a stacked card surface in a grid
 *      row  → a wide horizontal entry with a fixed mono meta rail
 *  - className?: string
 *
 * The date and reading-time labels are formatted CLIENT-side from the
 * hydration-safe locale, so they re-render in place when the language switcher
 * changes while the first client render matches the server HTML. The markup
 * itself lives in the pure `PostCardView`, which the build-time
 * `LatestPosts.astro` also renders — one card definition, two consumers. Both
 * variants wrap the generated `Card`, carry one `Button` action and keep their
 * tags as NON-interactive `ChipRow` labels (`variant="tag"`), distinct from the
 * filter controls above a list.
 */
import PostCardView from "@/components/blog/PostCardView";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { formatPostDate } from "@/lib/domain/posts";

interface PostCardProps {
  href: string;
  title: string;
  description: string;
  date?: string;
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
  readingMinutes,
  tags = [],
  headingLevel,
  variant = "card",
  className,
}: PostCardProps) {
  const { t, locale } = useHydrationSafeT();

  const dateLabel = date ? formatPostDate(date, locale) : undefined;
  const readingTime =
    readingMinutes === undefined
      ? undefined
      : t("blog.readTime", { minutes: readingMinutes });
  const readLabel = t("blog.readPost");

  return (
    <PostCardView
      href={href}
      title={title}
      description={description}
      dateLabel={dateLabel}
      datetime={date}
      readingTime={readingTime}
      readLabel={readLabel}
      tags={tags}
      headingLevel={headingLevel}
      variant={variant}
      className={className}
    />
  );
}
