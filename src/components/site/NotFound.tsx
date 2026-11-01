/**
 * NotFound — the 404 body as a hydrated React island.
 *
 * Every string comes from `useT`, bound to the store's active locale, so the
 * 404 copy re-renders in place when the language switcher changes the locale —
 * no navigation, no reload.
 *
 * Hydration safety mirrors `SiteHeader`/`SiteFooter`: the build-time SSR HTML is
 * always the DEFAULT locale, while the store may already hold another locale on
 * the first client render. Rendering the default locale until `mounted` flips
 * keeps the hydration render byte-identical to the server and eliminates the
 * mismatch; the store locale is adopted immediately after mount.
 *
 * Styling uses the generated shadcn `Card`/`Button` and the shared `Heading`.
 * The big numeral is painted with a plain `text-primary` fill — NO
 * `background-clip: text` — so `forced-colors: active` keeps it visible instead
 * of painting it transparent.
 */

import { useEffect, useState } from "react";

import Heading from "@/components/shared/typography/Heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

const HOME_HREF = "/";

export default function NotFound() {
  const t = useT();
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

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
            {tr("notFound.heading")}
          </Heading>
          <p className="m-0 max-w-[var(--measure)] text-pretty text-muted-foreground">
            {tr("notFound.body")}
          </p>
          <Button
            size="lg"
            className="min-h-11 rounded-full px-5"
            render={
              <a href={HOME_HREF}>
                <span className="text-primary-foreground">
                  {tr("notFound.backHome")}
                </span>
              </a>
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
