/**
 * PostArticle — the CHROME of a single blog post as a hydrated React island.
 *
 * The Markdown body stays Astro-rendered (`render(post)` + `<Content/>` in the
 * page); only the surrounding chrome — the back link, the title, the date /
 * reading-time rail and the quiet tag links — lives here, so it re-renders in
 * place when the language switcher changes the store locale. A single soft
 * brand glow behind the masthead is the only ornament (styled in `global.css`,
 * because an Astro scoped `<style>` cannot reach React markup).
 *
 * The page owns the ONE `<article>` landmark (`[slug].astro` wraps this chrome
 * and the Markdown body), so this component's wrapper is a plain `<div>` with
 * the same `.post__article` class. The post title and tags are zh-hant content
 * and carry `lang="zh-Hant"`; the back link, date and reading time are fixed
 * chrome and inherit the surrounding `<html lang>` instead.
 *
 * Hydration safety mirrors `SiteHeader`/`SiteFooter`: the single URL space
 * renders every page in the DEFAULT locale at build time, while the store may
 * already hold another locale on the first client render. We render the default
 * locale until `mounted` flips, which keeps the hydration render byte-identical
 * to the SSR HTML, then correct to the store locale after mount.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import ChipRow from "@/components/shared/ChipRow";
import Cluster from "@/components/shared/layout/Cluster";
import { useLocale } from "@/hooks/useLocale";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { blogIndexPath, blogTagPath, formatPostDate } from "@/lib/domain/posts";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface PostArticleProps {
  /** Post title (from frontmatter). */
  title: string;
  /** Filename calendar day `YYYY-MM-DD`; formatted per-locale on the client. */
  date: string;
  /** Post tags; each becomes a link to its tag archive. */
  tags?: string[];
  /** Estimated whole-minute reading time (locale-independent). */
  readingMinutes?: number;
}

export default function PostArticle({
  title,
  date,
  tags = [],
  readingMinutes,
}: PostArticleProps) {
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

  const tagItems = tags.map((tag) => ({
    label: tag,
    href: blogTagPath(tag),
  }));

  const readLabel =
    readingMinutes === undefined
      ? undefined
      : tr("blog.readTime", { minutes: readingMinutes });

  return (
    <>
      <nav className="post__back" aria-label={tr("blog.backToIndex")}>
        <a className="post__back-link" href={blogIndexPath()}>
          <span aria-hidden="true">←</span>
          {tr("blog.backToIndex")}
        </a>
      </nav>

      <div className="post__article">
        <header className="post__header">
          <h1 className="post__title" lang="zh-Hant">
            {title}
          </h1>
          <Cluster as="p" gap={3} align="baseline" className="post__meta">
            <time className="post__date" dateTime={date}>
              {formatPostDate(date, activeLocale)}
            </time>
            <span className="post__sep" aria-hidden="true">
              ·
            </span>
            {readLabel && <span className="post__reading">{readLabel}</span>}
          </Cluster>
          {tagItems.length > 0 && (
            <div className="post__tags" lang="zh-Hant">
              <ChipRow gap={2} ariaLabel={tr("blog.tagged")} items={tagItems} />
            </div>
          )}
        </header>
      </div>
    </>
  );
}
