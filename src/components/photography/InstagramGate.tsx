/**
 * InstagramGate — the click-to-load consent gate for the photography photo wall.
 *
 * Nothing from Instagram is requested on page load: the wall renders the
 * server-built portfolio index plus this panel, and `instagram.com/embed.js`
 * is appended only after the visitor opts in. The script injection, the
 * dedupe and the reveal/hide of the server-rendered blockquote layer all go
 * through the injected `DomPort` (`clientDeps.adapters.dom`), so this
 * component never reaches for `document` or `window` and the no-op double
 * keeps it testable.
 *
 * The build-time blockquotes and per-post link fallbacks stay Astro-rendered in
 * `.ig-embeds[hidden]`; the gate only toggles their `hidden` attribute. On a
 * provider failure the layer is hidden again, the local index stays visible and
 * the panel shows a destructive `Alert` with a direct link-out, so a blocked
 * script never leaves a blank dark panel or a broken embed behind. All copy is
 * zh-hant page content, not fixed chrome; the panel is built from the generated
 * shadcn `Card`, `Button` and `Alert` primitives.
 */

import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import { useClientDeps } from "@/components/shared/ClientDepsContext";
import AlertState from "@/components/shared/state/AlertState";
import SpinnerState from "@/components/shared/state/SpinnerState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The server-rendered oEmbed layer the gate reveals after consent. */
const EMBEDS_SELECTOR = "[data-ig-embeds]";
/** The at-rest portfolio index, retired once the real embeds load. */
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
  /** How many posts the wall resolves, so the note states the cost. */
  postCount: number;
}

const BUTTON_LABEL: Record<Exclude<GateState, "loaded">, string> = {
  idle: "載入 Instagram 貼文",
  loading: "正在載入…",
  error: "再試一次",
};

export default function InstagramGate({
  scriptSrc,
  profileHref,
  handle,
  postCount,
}: InstagramGateProps) {
  const deps = useClientDeps();
  const [state, setState] = useState<GateState>("idle");
  const loading = state === "loading";

  async function load() {
    if (loading) return;
    const dom = deps.adapters.dom;

    setState("loading");
    /*
     * Reveal before injecting so Meta's library finds the blockquotes in
     * layout when it processes them; the `embed-frame` skeleton covers
     * the light placeholder until the real iframe arrives. A failed load
     * hides the layer again below, so nothing half-rendered is left behind.
     */
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
    <Card data-ig-consent data-ig-state={state} className="w-full">
      <CardContent className="flex flex-col items-start gap-3">
        {state === "loaded" ? (
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="m-0 inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            <span>已載入 Instagram 貼文。</span>
          </p>
        ) : (
          <>
            <p className="m-0 max-w-[46ch] text-sm text-muted-foreground">
              {postCount} 則貼文由 Instagram 提供，按下載入後才會連線下載。
            </p>

            <Button
              type="button"
              size="lg"
              className="min-h-11 rounded-full px-5"
              onClick={load}
              disabled={loading}
              aria-busy={loading}
            >
              {state === "error" ? (
                <RefreshCw aria-hidden="true" />
              ) : (
                <Camera aria-hidden="true" />
              )}
              <span>{BUTTON_LABEL[state]}</span>
            </Button>

            {loading ? (
              <SpinnerState
                label="正在載入 Instagram 貼文…"
                showLabel
                spinner
                className="text-sm text-muted-foreground"
              />
            ) : null}

            {state === "error" ? (
              <AlertState
                data-ig-gate-error
                variant="destructive"
                icon={<CircleAlert aria-hidden="true" />}
                title="無法載入 Instagram 貼文"
                description="Instagram 的載入程式被封鎖或連線失敗。作品索引仍然可用，你也可以直接到 Instagram 觀看。"
              >
                <Button
                  variant="outline"
                  className="mt-2 min-h-11 rounded-full px-4"
                  render={
                    <a href={profileHref} target="_blank" rel="noopener">
                      <span>在 Instagram 觀看 {handle}</span>
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  }
                />
              </AlertState>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
