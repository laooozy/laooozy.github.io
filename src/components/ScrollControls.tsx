/**
 * ScrollControls — floating scroll-to-top / scroll-to-bottom chrome.
 *
 * Both buttons are icon-only and start hidden (`showTop`/`showBottom` are
 * `false` on the server and on the first client render, so hydration always
 * matches). Visibility is derived from the DOM port's scroll subscription
 * (`onScroll`, `scrollY`, `distanceFromBottom`) — this island never attaches a
 * listener or touches a browser global itself. Labels are locale-reactive via
 * `useT` behind the same `mounted` gate as `SiteFooter`.
 */

import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import { useEffect, useState } from "react";

import { clientDeps } from "@/client/bootstrap";
import { useT, type Translate } from "@/hooks/useT";
import { defaultLang, t as translate } from "@/i18n";

/** The build-time locale every SSR render is emitted in. Stable, no deps. */
const defaultTranslate: Translate = (key, vars) =>
  translate(defaultLang, key, vars);

const SCROLL_CONTROLS_CSS = `
.scroll-controls {
	position: fixed;
	inset-inline: 0;
	bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
	margin-inline: auto;
	inline-size: fit-content;
	display: flex;
	flex-direction: column;
	gap: var(--space-2);
	z-index: calc(var(--z-sticky) - 1);
	pointer-events: none;
}

.scroll-controls__button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	inline-size: 44px;
	block-size: 44px;
	padding: 0;
	border: 1px solid var(--control-border);
	border-radius: var(--radius-pill);
	background: var(--surface);
	background-image: var(--card-bg);
	color: var(--text);
	box-shadow: var(--card-inset), 0 8px 24px -12px rgb(0 0 0 / 0.6);
	-webkit-backdrop-filter: blur(var(--glass-blur));
	backdrop-filter: blur(var(--glass-blur));
	pointer-events: none;
	cursor: pointer;
	opacity: 0;
	visibility: hidden;
	transform: translateY(8px);
	transition:
		opacity 150ms var(--ease-out),
		transform 150ms var(--ease-out),
		color 150ms var(--ease-out),
		border-color 150ms var(--ease-out);
}

.scroll-controls__button[data-visible="true"] {
	opacity: 1;
	visibility: visible;
	transform: translateY(0);
	pointer-events: auto;
}

.scroll-controls__button:hover {
	border-color: var(--accent-text);
	color: var(--accent-text);
}

.scroll-controls__button:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
	.scroll-controls__button {
		transition: none;
	}
}
`;

export default function ScrollControls() {
  const t = useT(clientDeps);
  const [mounted, setMounted] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dom = clientDeps.adapters.dom;

    const sync = (y: number) => {
      setShowTop(y > 500);
      setShowBottom(y > 500 && dom.distanceFromBottom() > 240);
    };

    sync(dom.scrollY());
    return dom.onScroll(sync);
  }, []);

  const tr = mounted ? t : defaultTranslate;
  const dom = clientDeps.adapters.dom;

  return (
    <div className="scroll-controls">
      <style dangerouslySetInnerHTML={{ __html: SCROLL_CONTROLS_CSS }} />
      <button
        type="button"
        className="scroll-controls__button"
        aria-label={tr("a11y.scrollToTop")}
        onClick={(event) => {
          // Hiding the focused button mid-scroll cancels Chrome's smooth scroll.
          event.currentTarget.blur();
          dom.scrollToTop();
        }}
        data-visible={showTop}
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
      >
        <ArrowUpToLine size={20} aria-hidden />
      </button>
      <button
        type="button"
        className="scroll-controls__button"
        aria-label={tr("a11y.scrollToBottom")}
        onClick={(event) => {
          event.currentTarget.blur();
          dom.scrollToBottom();
        }}
        data-visible={showBottom}
        tabIndex={showBottom ? 0 : -1}
        aria-hidden={!showBottom}
      >
        <ArrowDownToLine size={20} aria-hidden />
      </button>
    </div>
  );
}
