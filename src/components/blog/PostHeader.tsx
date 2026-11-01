/**
 * PostHeader — the CHROME of a single blog post as a hydrated React island.
 *
 * The Markdown body stays Astro-rendered (`render(post)` + `<Content/>` in the
 * page); only the surrounding chrome — the back action, the title, the
 * date / reading-time rail and the quiet tag links — lives here, so it
 * re-renders in place when the language switcher changes the store locale.
 *
 * Composition is the generated primitive set: a `Button` for the one back
 * action, a `Badge` per tag, a `Separator` that closes the header, and the
 * shared `Cluster` layout for both the meta rail and the tag row. The page owns
 * the ONE `<article>` landmark (`[slug].astro` wraps this chrome and the
 * Markdown body), so this component never adds a second one.
 *
 * The post title and tags are zh-hant content and carry `lang="zh-Hant"`; the
 * back action, date and reading time are fixed chrome and inherit the
 * surrounding `<html lang>` instead.
 *
 * Hydration safety comes from `useHydrationSafeT`: the single URL space renders
 * every page in the DEFAULT locale at build time, while the store may already
 * hold another locale on the first client render. The hook pins the build
 * locale until mount, keeping the hydration render byte-identical to the SSR
 * HTML, then corrects to the store locale.
 */

import { ArrowLeft } from "lucide-react";

import { INTERACTIVE_TOUCH_CLASSES } from "@/components/shared/layout/classes";
import Cluster from "@/components/shared/layout/Cluster";
import Heading from "@/components/shared/typography/Heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { blogIndexPath, blogTagPath, formatPostDate } from "@/lib/domain/posts";
import { cn } from "@/lib/utils";

/** Quiet-tag styling shared by every tag link (ChipRow's `tag` treatment). */
const TAG_CLASSES = cn(
  "max-w-full border-border bg-secondary/60 text-muted-foreground",
  "transition-colors hover:bg-muted hover:text-foreground",
  INTERACTIVE_TOUCH_CLASSES,
);

interface PostHeaderProps {
  /** Post title (from frontmatter). */
  title: string;
  /** Filename calendar day `YYYY-MM-DD`; formatted per-locale on the client. */
  date: string;
  /** Post tags; each becomes a link to its tag archive. */
  tags?: string[];
  /** Estimated whole-minute reading time (locale-independent). */
  readingMinutes?: number;
}

export default function PostHeader({
  title,
  date,
  tags = [],
  readingMinutes,
}: PostHeaderProps) {
  const { t, locale } = useHydrationSafeT();

  const readLabel =
    readingMinutes === undefined
      ? undefined
      : t("blog.readTime", { minutes: readingMinutes });

  return (
    <>
      <nav aria-label={t("blog.backToIndex")} className="mb-(--space-5)">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5 min-h-11 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
          render={
            <a href={blogIndexPath()}>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              {t("blog.backToIndex")}
            </a>
          }
        />
      </nav>

      <header className="pb-(--space-6)">
        <Heading
          id="post-title"
          level={1}
          lang="zh-Hant"
          className="mb-(--space-4) text-[length:var(--text-page-title)] wrap-anywhere"
        >
          {title}
        </Heading>

        <Cluster
          as="p"
          gap={3}
          align="baseline"
          className="m-0 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-wide)] text-muted-foreground"
        >
          <time dateTime={date}>{formatPostDate(date, locale)}</time>
          {readLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{readLabel}</span>
            </>
          )}
        </Cluster>

        {tags.length > 0 && (
          <nav
            aria-label={t("blog.tagged")}
            lang="zh-Hant"
            className="mt-(--space-5)"
          >
            <Cluster as="ul" gap={2} className="m-0 list-none p-0">
              {tags.map((tag) => (
                <li key={tag} className="min-w-0">
                  <Badge
                    variant="outline"
                    className={TAG_CLASSES}
                    render={<a href={blogTagPath(tag)}>{tag}</a>}
                  />
                </li>
              ))}
            </Cluster>
          </nav>
        )}
      </header>

      <Separator className="mt-(--space-6)" />
    </>
  );
}
