/**
 * SiteFooter — the site chrome's footer as a hydrated React island.
 *
 * It renders the copyright line and the committed update stamp, driven by the
 * hydration-safe locale hook, so the footer text re-renders in place when the
 * language switcher changes the locale — no navigation, no reload.
 *
 * Build-time data, not a runtime clock
 * ------------------------------------
 * Both values arrive as serializable props from `BaseLayout.astro`:
 * `year` is resolved once at build time and `siteUpdated` is the validated
 * stamp. This island never imports the build-time IO edge and never reads the
 * clock, so the server HTML and the client render cannot disagree about the
 * year or the stamp, even if a visitor's clock is wrong.
 *
 * Hydration safety comes from `useHydrationSafeT`: the build-time SSR HTML is
 * always the DEFAULT locale, so the hook pins that locale until mount and only
 * then adopts the store locale. The hydration render is identical to the
 * server and there is no mismatch.
 */

import { Separator } from "@/components/ui/separator";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";

/** The serializable shape of a `SiteUpdated` stamp. */
export interface SiteUpdatedStamp {
  /** The committed stamp verbatim, for `<time dateTime>`. */
  iso: string;
  /** The same stamp with the date and minute separated by one space. */
  display: string;
}

export interface SiteFooterProps {
  /**
   * Calendar year resolved by `BaseLayout.astro` at build time. Never a
   * client clock read: a visitor in a different year must still see the year
   * the site was built for.
   */
  year: number;
  /** The validated build-time stamp, passed as a serializable prop. */
  siteUpdated: SiteUpdatedStamp;
}

export default function SiteFooter({ year, siteUpdated }: SiteFooterProps) {
  const { t } = useHydrationSafeT();

  return (
    <footer
      className="site-footer relative z-[var(--z-base)] border-t border-border/40 py-6"
      data-site-footer=""
    >
      <div className="mx-auto flex w-full max-w-(--container) flex-col gap-3 px-[clamp(var(--space-4),4vw,var(--space-6))] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="m-0 max-w-none text-sm text-muted-foreground">
          © {year} {t("home.title")} · {t("footer.rights")}
        </p>

        <Separator className="bg-border/40 sm:hidden" />

        <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-[calc(44px+var(--space-4)+env(safe-area-inset-right,0px))] text-sm text-muted-foreground tabular-nums sm:pr-[calc(44px+var(--space-5)+env(safe-area-inset-right,0px))]">
          <span>{t("footer.updated")}</span>
          <time dateTime={siteUpdated.iso}>{siteUpdated.display}</time>
        </p>
      </div>
    </footer>
  );
}
