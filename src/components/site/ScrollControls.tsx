/**
 * ScrollControls — the single fixed back-to-top chrome control.
 *
 * One icon-only shadcn `Button` with a shadcn tooltip and an accessible name.
 * It starts hidden on the server AND on the first client render (`showTop` is
 * `false` in both), so hydration always matches. Visibility is derived from the
 * DOM port's single scroll subscription (`onScroll`, `scrollY`) — this island
 * never attaches a listener, starts a frame loop, or touches a browser global.
 * `scrollToTop` on the port already chooses `behavior: "auto"` under reduced
 * motion, so the jump is instant when the user asks for less motion.
 *
 * Position: fixed bottom-right, inset by the safe-area insets and the page
 * gutter. `BaseLayout` reserves a matching bottom band inside `<main>` so the
 * final row/card can always clear the control rather than relying on luck.
 * The label is locale-reactive via `useT` behind the same `mounted` gate as
 * `SiteHeader`/`SiteFooter`.
 */

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "zustand";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import TooltipState from "@/components/shared/state/TooltipState";
import { Button } from "@/components/ui/button";
import { type Translate, useT } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";
import { cn } from "@/lib/utils";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

/**
 * Scroll offset (CSS px) past which the control appears. It is hidden at the
 * very top, where "back to top" would be a no-op.
 */
const SHOW_AFTER_PX = 500;

/** Hidden state: no layout, no pointer events, out of the tab order. */
const HIDDEN_CLASSES = "pointer-events-none invisible translate-y-2 opacity-0";

/** Shown state: the single visible control. */
const SHOWN_CLASSES = "pointer-events-auto visible translate-y-0 opacity-100";

export default function ScrollControls() {
  const deps = useClientDeps();
  const t = useT();
  const menuOpen = useStore(deps.store, (state) => state.headerMenuOpen);
  const [mounted, setMounted] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dom = deps.adapters.dom;

    const sync = (y: number) => {
      setShowTop(y > SHOW_AFTER_PX);
    };

    sync(dom.scrollY());
    return dom.onScroll(sync);
  }, [deps]);

  const tr = mounted ? t : defaultTranslate;
  const dom = deps.adapters.dom;
  // The mobile disclosure panel overlays the control, so hide it (and take it
  // out of the Tab order) while the menu is open.
  const visible = showTop && !menuOpen;

  return (
    <div className="contents">
      <TooltipState
        content={tr("a11y.scrollToTop")}
        side="top"
        align="center"
        trigger={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={tr("a11y.scrollToTop")}
            data-back-to-top=""
            data-visible={visible ? "true" : "false"}
            tabIndex={visible ? 0 : -1}
            aria-hidden={!visible}
            onClick={(event) => {
              // Hiding the focused button mid-scroll cancels Chrome's smooth
              // scroll; blur first so the jump always completes.
              event.currentTarget.blur();
              dom.scrollToTop();
            }}
            className={cn(
              "fixed z-[calc(var(--z-sticky)_-_1)] size-11 min-h-11 min-w-11 rounded-full border-[var(--control-border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)]",
              "right-[calc(var(--space-4)_+_env(safe-area-inset-right,0px))] bottom-[calc(var(--space-4)_+_env(safe-area-inset-bottom,0px))]",
              "sm:right-[calc(var(--space-5)_+_env(safe-area-inset-right,0px))] sm:bottom-[calc(var(--space-5)_+_env(safe-area-inset-bottom,0px))]",
              "transition-[opacity,transform,color,border-color] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none",
              "hover:border-[var(--accent-text)] hover:text-[var(--accent-text)]",
              visible ? SHOWN_CLASSES : HIDDEN_CLASSES,
            )}
          >
            <ArrowUp size={20} aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
