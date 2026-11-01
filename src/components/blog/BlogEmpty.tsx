/**
 * BlogEmpty — the locale-reactive zero-post panel used by the blog listing
 * island.
 *
 * Labels come from the fixed-chrome dictionary through the hydration-safe
 * locale hook, so the panel re-renders in place on a language switch while the
 * server and the first client render stay byte-identical.
 */
import BlogEmptyView from "@/components/blog/BlogEmptyView";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";

export default function BlogEmpty() {
  const { t } = useHydrationSafeT();

  return (
    <BlogEmptyView
      heading={t("blog.heading")}
      message={t("blog.empty")}
      homeLabel={t("notFound.backHome")}
      secondaryLabel={t("nav.photography")}
    />
  );
}
