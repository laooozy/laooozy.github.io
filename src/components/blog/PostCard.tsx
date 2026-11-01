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
 *  - headingLevel?: 2 | 3    default: 2 (page title is the h1); row variant only
 *  - variant?: "card" | "row"   default: "card"
 *      card → a stacked card surface in a grid
 *      row  → a wide horizontal entry with a fixed mono meta rail
 *  - className?: string
 *
 * The date and reading-time labels are formatted CLIENT-side from the store
 * locale (mounted gate), so they re-render in place when the language switcher
 * changes. The markup itself lives in the pure `PostCardView`, which the
 * build-time `LatestPosts.astro` also renders — one card definition, two
 * consumers. Both variants wrap the shared `Card`, so they inherit the glass
 * surface and the interactive hover lift. Tags are NON-interactive labels
 * (`ChipRow` default `variant="tag"`), distinct from the filter controls above
 * a list.
 */
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import PostCardView from "@/components/blog/PostCardView";
import { useLocale } from "@/hooks/useLocale";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { formatPostDate } from "@/lib/domain/posts";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

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

  const dateLabel = date ? formatPostDate(date, activeLocale) : undefined;
  const readingTime =
    readingMinutes === undefined
      ? undefined
      : tr("blog.readTime", { minutes: readingMinutes });

  return (
    <PostCardView
      href={href}
      title={title}
      description={description}
      dateLabel={dateLabel}
      datetime={date}
      readingTime={readingTime}
      tags={tags}
      headingLevel={headingLevel}
      variant={variant}
      className={className}
    />
  );
}
