/**
 * NotFound — the 404 body as a hydrated React island.
 *
 * Every string comes from the hydration-safe locale hook, so the 404 copy
 * re-renders in place when the language switcher changes the locale — no
 * navigation, no reload — while the first client render stays byte-identical
 * to the build-locale SSR HTML.
 *
 * Styling uses the generated shadcn `Card`/`Button` and the shared `Heading`.
 * The big numeral is painted with a plain `text-primary` fill — NO
 * `background-clip: text` — so `forced-colors: active` keeps it visible instead
 * of painting it transparent.
 */

import Heading from "@/components/shared/typography/Heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";

const HOME_HREF = "/";

export default function NotFound() {
  const { t } = useHydrationSafeT();

  return (
    <section
      data-not-found
      aria-labelledby="notfound-heading"
      className="mx-auto flex w-full max-w-[var(--container-narrow)] flex-col items-center gap-6 text-center"
    >
      <p
        data-not-found-code
        aria-hidden="true"
        className="m-0 font-mono text-[length:clamp(var(--text-4xl),18vw,8rem)] leading-none font-bold tracking-[var(--tracking-display)] text-primary select-none"
      >
        404
      </p>
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4">
          <Heading level={1} id="notfound-heading">
            {t("notFound.heading")}
          </Heading>
          <p className="m-0 max-w-[var(--measure)] text-pretty text-muted-foreground">
            {t("notFound.body")}
          </p>
          <Button
            size="lg"
            className="min-h-11 rounded-full px-5"
            render={
              <a href={HOME_HREF}>
                <span className="text-primary-foreground">
                  {t("notFound.backHome")}
                </span>
              </a>
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
