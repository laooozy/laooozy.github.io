/**
 * InstagramGate — the click-to-load consent gate for the photography photo wall.
 *
 * Nothing from Instagram is requested on page load: the wall renders the
 * server-built link cards plus this button, and `instagram.com/embed.js` is
 * appended only after the visitor opts in. The script injection, the dedupe and
 * the reveal/hide of the server-rendered blockquote layer all go through the
 * injected `DomPort` (`clientDeps.adapters.dom`), so this component never
 * reaches for `document` or `window` and the no-op double keeps it testable.
 *
 * The build-time blockquotes and link fallbacks stay Astro-rendered in
 * `.ig-embeds[hidden]`; the gate only toggles their `hidden` attribute. On a
 * provider failure the layer is hidden again, the link-card wall stays visible
 * and a local link-out card is shown, so a blocked script never leaves a blank
 * dark panel. All copy is zh-hant page content, not fixed chrome.
 */

import { ArrowUpRight, Camera, RefreshCw } from "lucide-react";
import { useState } from "react";

import { clientDeps } from "@/client/bootstrap";

/** The server-rendered oEmbed layer the gate reveals after consent. */
const EMBEDS_SELECTOR = "[data-ig-embeds]";
/** The at-rest link-card wall, superseded once the real embeds load. */
const GATE_CARDS_SELECTOR = "[data-ig-gate]";
/** Stable id so a second click can never append a duplicate script tag. */
const SCRIPT_ID = "instagram-embed";

type GateState = "idle" | "loading" | "loaded" | "error";

interface InstagramGateProps {
  /** The Instagram embed library URL, injected on consent only. */
  scriptSrc: string;
  /** The profile the fallback link-out points at. */
  profileHref: string;
  /** The handle shown in the fallback label, e.g. `@acg.laooozy`. */
  handle: string;
  /** How many posts the wall resolves, so the button states the cost. */
  postCount: number;
}

const STATUS: Record<GateState, string> = {
  idle: "",
  loading: "正在載入 Instagram 貼文…",
  loaded: "已載入 Instagram 貼文。",
  error: "無法載入 Instagram 貼文，請改用 Instagram 連結觀看。",
};

const BUTTON_LABEL: Record<GateState, string> = {
  idle: "載入 Instagram 貼文",
  loading: "正在載入…",
  loaded: "已載入 Instagram 貼文",
  error: "再試一次",
};

export default function InstagramGate({
  scriptSrc,
  profileHref,
  handle,
  postCount,
}: InstagramGateProps) {
  const [state, setState] = useState<GateState>("idle");
  const busy = state === "loading" || state === "loaded";

  async function load() {
    if (busy) return;
    const dom = clientDeps.adapters.dom;

    setState("loading");
    dom.setHidden(EMBEDS_SELECTOR, false);

    const loaded = await dom.loadScript(scriptSrc, { id: SCRIPT_ID });

    if (loaded) {
      dom.setHidden(GATE_CARDS_SELECTOR, true);
      setState("loaded");
    } else {
      dom.setHidden(EMBEDS_SELECTOR, true);
      setState("error");
    }
  }

  return (
    <div className="ig-consent" data-ig-state={state}>
      <button
        type="button"
        className="ig-consent__button"
        onClick={load}
        disabled={busy}
        aria-busy={state === "loading"}
      >
        {state === "error" ? (
          <RefreshCw className="ig-consent__icon" aria-hidden="true" />
        ) : (
          <Camera className="ig-consent__icon" aria-hidden="true" />
        )}
        <span>{BUTTON_LABEL[state]}</span>
      </button>

      {state === "idle" ? (
        <p className="ig-consent__note">
          {postCount} 則貼文由 Instagram 提供，按下後才會連線下載。
        </p>
      ) : null}

      <p
        className="ig-consent__status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {STATUS[state]}
      </p>

      {state === "error" ? (
        <a
          className="ig-consent__fallback"
          href={profileHref}
          target="_blank"
          rel="noopener"
        >
          <span>在 Instagram 觀看 {handle}</span>
          <ArrowUpRight className="ig-consent__icon" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
