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
 * Hydration safety mirrors `SiteHeader`/`SiteFooter`: the single URL space
 * renders every page in the DEFAULT locale at build time, while the store may
 * already hold another locale on the first client render. We render the default
 * locale until `mounted` flips, which keeps the hydration render byte-identical
 * to the SSR HTML, then correct to the store locale after mount.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import ChipRow from "@/components/ChipRow";
import Cluster from "@/components/layout/Cluster";
import { useLocale } from "@/hooks/useLocale";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { blogIndexPath, blogTagPath, formatPostDate } from "@/lib/domain/posts";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface PostArticleProps {
  /** Post title (from frontmatter). */
  title: string;
  /** ISO-8601 date; formatted per-locale on the client. */
  datetime: string;
  /** Post tags; each becomes a link to its tag archive. */
  tags?: string[];
  /** Estimated whole-minute reading time (locale-independent). */
  readingMinutes?: number;
}

export default function PostArticle({
  title,
  datetime,
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

      <article className="post__article">
        <header className="post__header">
          <h1 className="post__title">{title}</h1>
          <Cluster as="p" gap={3} align="baseline" className="post__meta">
            <time className="post__date" dateTime={datetime}>
              {formatPostDate(new Date(datetime), activeLocale)}
            </time>
            <span className="post__sep" aria-hidden="true">
              ·
            </span>
            {readLabel && <span className="post__reading">{readLabel}</span>}
          </Cluster>
          {tagItems.length > 0 && (
            <ChipRow
              className="post__tags"
              gap={2}
              ariaLabel={tr("blog.tagged")}
              items={tagItems}
            />
          )}
        </header>
      </article>
    </>
  );
}
