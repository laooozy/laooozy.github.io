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
 * Hydration safety comes from `useHydrationSafeT`: the static build emits the
 * default locale, so the first client render keeps the build-locale label and
 * only then adopts the store locale. Item text stays zh-hant, which the route
 * wrapper already marks `lang="zh-Hant"`.
 */

import { Pause, Play } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import { useHydrationSafeT } from "@/hooks/useHydrationSafeT";
import { langAttr } from "@/i18n";
import type { NowItem } from "@/lib/domain/now";
import { cn } from "@/lib/utils";

interface NowTickerClientProps {
  items: readonly NowItem[];
}

const ITEM_CLASS = cn(
  "now-ticker__item text-[var(--text)] no-underline hover:text-[var(--accent-text)] hover:underline focus-visible:text-[var(--accent-text)] focus-visible:underline",
);

function NowTickerItem({
  item,
  duplicate,
}: {
  item: NowItem;
  duplicate: boolean;
}) {
  if (item.href) {
    return (
      <a
        className={ITEM_CLASS}
        href={item.href}
        tabIndex={duplicate ? -1 : undefined}
        draggable={false}
      >
        {item.text}
      </a>
    );
  }

  return <span className={ITEM_CLASS}>{item.text}</span>;
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
            <span
              className="now-ticker__sep text-[var(--text-muted)]"
              aria-hidden="true"
            >
              ·
            </span>
          )}
          <NowTickerItem item={item} duplicate={duplicate} />
        </Fragment>
      ))}
    </>
  );
}

const GROUP_CLASS =
  "now-ticker__group flex flex-wrap items-center gap-[var(--space-2)]";
const RUNNING_GROUP_CLASS = "w-max flex-nowrap pr-[var(--space-2)]";

export default function NowTickerClient({ items }: NowTickerClientProps) {
  const deps = useClientDeps();
  const { t, locale } = useHydrationSafeT();
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduced = deps.adapters.dom.prefersReducedMotion();
    setRunning(!reduced && items.length >= 2);
  }, [deps, items.length]);

  const label = t("home.nowLabel");
  const toggleLabel = paused ? t("now.play") : t("now.pause");

  return (
    <div
      className={cn(
        "hero__status now-ticker m-0 max-w-full items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--text-muted)]",
        running
          ? "is-running flex w-full max-w-[40rem] flex-nowrap"
          : "inline-flex flex-wrap",
      )}
      data-paused={paused ? "true" : "false"}
    >
      <span
        className="hero__dot size-2 rounded-[var(--radius-pill)] bg-[var(--accent)] shadow-[0_0_12px_-2px_var(--accent)] motion-safe:animate-hero-pulse"
        aria-hidden="true"
      />
      <span
        className="hero__status-label font-semibold text-[var(--accent-text)]"
        lang={langAttr[locale]}
      >
        {label}
      </span>

      <div
        className={cn(
          "now-ticker__viewport min-w-0",
          running &&
            "flex-auto overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]",
        )}
      >
        <div
          className={cn(
            "now-ticker__track flex min-w-0 items-center gap-[var(--space-2)]",
            running &&
              "w-max flex-nowrap gap-0 will-change-transform hover:[animation-play-state:paused] has-[:focus-visible]:[animation-play-state:paused] motion-safe:animate-now-ticker",
            running && paused && "[animation-play-state:paused]",
          )}
        >
          <div className={cn(GROUP_CLASS, running && RUNNING_GROUP_CLASS)}>
            <NowTickerItems items={items} duplicate={false} />
          </div>
          {running && (
            <div
              className={cn(
                GROUP_CLASS,
                RUNNING_GROUP_CLASS,
                "motion-reduce:hidden",
              )}
              aria-hidden="true"
            >
              <NowTickerItems items={items} duplicate />
            </div>
          )}
        </div>
      </div>

      {running && (
        <button
          type="button"
          className="now-ticker__toggle m-0 inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-[var(--control-border)] bg-[var(--surface)] p-0 text-[var(--text-muted)] transition-[color,border-color,background-color] duration-[var(--dur-fast)] ease-brand hover:border-[var(--control-border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label={toggleLabel}
          aria-pressed={paused}
          lang={langAttr[locale]}
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
