/**
 * NowTickerClient — the hydrated half of the home "now" ticker.
 *
 * Server/no-JS base: the items render as a normal wrapping line, with the fixed
 * chrome `home.nowLabel` beside them and NO pause control. After mount the
 * component upgrades that line to a CSS marquee when there are 2+ items and the
 * visitor has not asked for reduced motion: it adds the duplicate group
 * (`aria-hidden`, links at `tabIndex={-1}` so there is no second tab stop) and
 * the 44px pause/play toggle. The animation itself is pure CSS; this component
 * never starts an animation frame loop.
 *
 * Hydration safety mirrors `PostArticle`: the static build emits the default
 * locale, so the first client render keeps the default label until `mounted`
 * flips and the store locale can be read. Item text stays zh-hant, which the
 * route wrapper already marks `lang="zh-Hant"`.
 */

import { Pause, Play } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import { useLocale } from "@/hooks/useLocale";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, langAttr, t as translate } from "@/i18n";
import type { NowItem } from "@/lib/domain/now";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

interface NowTickerClientProps {
  items: readonly NowItem[];
}

function NowTickerItem({
  item,
  duplicate,
}: {
  item: NowItem;
  duplicate: boolean;
}) {
  const className = "now-ticker__item";

  if (item.href) {
    return (
      <a
        className={className}
        href={item.href}
        tabIndex={duplicate ? -1 : undefined}
        draggable={false}
      >
        {item.text}
      </a>
    );
  }

  return <span className={className}>{item.text}</span>;
}

function NowTickerItems({
  items,
  duplicate,
}: {
  items: readonly NowItem[];
  duplicate: boolean;
}) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={`${index}-${item.text}`}>
          {index > 0 && (
            <span className="now-ticker__sep" aria-hidden="true">
              ·
            </span>
          )}
          <NowTickerItem item={item} duplicate={duplicate} />
        </Fragment>
      ))}
    </>
  );
}

export default function NowTickerClient({ items }: NowTickerClientProps) {
  const t = useT(clientDeps);
  const { locale } = useLocale(clientDeps);
  // `false` on the server AND on the first client render, so SSR and the
  // hydration render agree; flipped after mount.
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reduced = clientDeps.adapters.dom.prefersReducedMotion();
    setRunning(!reduced && items.length >= 2);
  }, [items.length]);

  const tr = mounted ? t : defaultTranslate;
  const activeLocale = mounted ? locale : defaultLang;
  const label = tr("home.nowLabel");
  const toggleLabel = paused ? tr("now.play") : tr("now.pause");

  return (
    <div
      className={`hero__status now-ticker${running ? " is-running" : ""}`}
      data-paused={paused ? "true" : "false"}
    >
      <span className="hero__dot" aria-hidden="true" />
      <span className="hero__status-label" lang={langAttr[activeLocale]}>
        {label}
      </span>

      <div className="now-ticker__viewport">
        <div className="now-ticker__track">
          <div className="now-ticker__group">
            <NowTickerItems items={items} duplicate={false} />
          </div>
          {running && (
            <div className="now-ticker__group" aria-hidden="true">
              <NowTickerItems items={items} duplicate />
            </div>
          )}
        </div>
      </div>

      {running && (
        <button
          type="button"
          className="now-ticker__toggle"
          aria-label={toggleLabel}
          aria-pressed={paused}
          lang={langAttr[activeLocale]}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
