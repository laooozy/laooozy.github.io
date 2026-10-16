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
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import Card from "@/components/Card";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

const HOME_HREF = "/";

export default function NotFound() {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;

  return (
    <section className="not-found" aria-labelledby="notfound-heading">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <Card className="not-found__card">
        <h1 id="notfound-heading" className="not-found__title">
          {tr("notFound.heading")}
        </h1>
        <p className="not-found__body">{tr("notFound.body")}</p>
        <a className="not-found__link" href={HOME_HREF}>
          {tr("notFound.backHome")} →
        </a>
      </Card>
    </section>
  );
}
