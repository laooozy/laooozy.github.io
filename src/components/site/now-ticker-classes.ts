/**
 * The marquee's class strings, extracted so the Playwright computed-style spec
 * can exercise the real Tailwind cascade without importing the component (which
 * pulls in the client composition root).
 *
 * The pause lives on the track only: line hover and descendant keyboard focus.
 * The toggle is a sibling of the track, so its own hover or focus never pauses
 * the marquee. `NOW_TICKER_PAUSED_CLASS` is the explicit toggle state; it is
 * marked important because the `animation` shorthand from
 * `animate-now-ticker` sits later in the cascade and would otherwise reset
 * `animation-play-state` to running.
 */

export const NOW_TICKER_RUNNING_TRACK_CLASS =
  "w-max flex-nowrap gap-0 will-change-transform hover:[animation-play-state:paused] has-[:focus-visible]:[animation-play-state:paused] motion-safe:animate-now-ticker";

export const NOW_TICKER_PAUSED_CLASS = "[animation-play-state:paused]!";

export const NOW_TICKER_TOGGLE_CLASS =
  "now-ticker__toggle m-0 inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-[var(--control-border)] bg-[var(--surface)] p-0 text-[var(--text-muted)] transition-[color,border-color,background-color] duration-[var(--dur-fast)] ease-brand hover:border-[var(--control-border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
