/**
 * SiteFooter — the site chrome's footer as a hydrated React island.
 *
 * It renders the copyright line and the contact button, both driven by `useT`
 * (store-bound locale), so the footer text re-renders in place when the language
 * switcher changes the locale — no navigation, no reload.
 *
 * Hydration safety mirrors `SiteHeader`: the build-time SSR HTML is always the
 * DEFAULT locale, while the store may already hold another locale on the first
 * client render. Rendering the default locale until `mounted` flips keeps the
 * hydration render identical to the server and eliminates the mismatch; the
 * store locale is adopted immediately after mount.
 */

import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import LinkButton from "@/components/LinkButton";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

export default function SiteFooter() {
  const t = useT(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount to adopt the store locale.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <p className="site-footer__copy">
          © {year} {tr("home.title")} · {tr("footer.rights")}
        </p>
        <LinkButton href="/#contact" label={tr("nav.contact")} />
      </div>
    </footer>
  );
}
