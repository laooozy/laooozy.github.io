/**
 * BlogEmpty — the locale-reactive zero-post panel used by the blog listing
 * island.
 *
 * Labels come from the fixed-chrome dictionary through `useT`, so the panel
 * re-renders in place on a language switch. The mounted gate mirrors the rest
 * of the hydrated chrome: the server and the first client render use the
 * default locale, then the store locale is adopted after mount.
 */
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import BlogEmptyView from "@/components/BlogEmptyView";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

export default function BlogEmpty() {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

  return (
    <BlogEmptyView
      heading={tr("nav.blog")}
      message={tr("blog.empty")}
      homeLabel={tr("notFound.backHome")}
      secondaryLabel={tr("nav.photography")}
    />
  );
}
