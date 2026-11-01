/**
 * Instagram photo wall I/O edge.
 *
 * Resolves each Instagram permalink through Meta's public oEmbed endpoint at
 * BUILD time (verified 2026-06: the oEmbed *token* requirement was dropped, so
 * the endpoint can be called with no secret):
 *
 *   GET https://graph.facebook.com/v25.0/instagram_oembed
 *       ?url=<post-url>&omitscript=true
 *   → 200 { html: "<blockquote class=\"instagram-media\">…" }
 *
 * `omitscript=true` returns the official blockquote WITHOUT a <script> tag, so
 * the page controls when/how the Instagram library loads (once per page — see
 * `pages/photographer.astro`). A private / deleted / embed-disabled post returns HTTP 400
 * with `code 24`; that URL degrades to an empty `html` + `failed: true` so an
 * offline build or a bad permalink renders a plain link-out instead of a hole.
 *
 * Every request is bounded by an `AbortSignal` timeout (default 10 s), so a
 * hanging provider can never stall the build; an abort is just another failure
 * (`failed: true`) and never throws.
 *
 * `mode: "fixture"` is an explicit, opt-in build seam used only by local/CI E2E
 * builds through `INSTAGRAM_OEMBED_FIXTURE=1`; it makes no network request and
 * returns a deterministic blockquote for each permalink. Production builds
 * default to `"live"`.
 *
 * This is the I/O edge (network), so it lives outside the pure domain. The
 * result is plain, serializable data rendered by `InstagramWall.astro`.
 */

/** One resolved Instagram embed: the source URL plus its build-time result. */
export interface InstagramEmbedData {
  /** The public Instagram permalink this embed resolves. */
  url: string;
  /** The oEmbed blockquote HTML, or `""` when the request failed. */
  html: string;
  /** `true` when the oEmbed request errored, timed out or returned no HTML. */
  failed: boolean;
}

/** Live requests abort after this long unless the caller overrides it. */
export const DEFAULT_OEMBED_TIMEOUT_MS = 10_000;

/**
 * `"live"` calls Meta; `"fixture"` returns deterministic HTML and makes no
 * network request (see the module comment).
 */
export type InstagramEmbedMode = "live" | "fixture";

/** Per-call overrides, mainly so the timeout test can run in milliseconds. */
export interface InstagramEmbedOptions {
  timeoutMs?: number;
  mode?: InstagramEmbedMode;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Deterministic oEmbed-shaped blockquote for a permalink, used only in fixture
 * mode. The two shipped permalinks in `src/data/instagram.ts` both flow through
 * this generator so an offline/E2E build renders the same embed layer shape
 * without calling Meta.
 */
export function instagramFixtureHtml(url: string): string {
  const href = escapeAttribute(url);
  return `<blockquote class="instagram-media" data-instgrm-permalink="${href}" data-instgrm-version="14"><a href="${href}" target="_blank" rel="noopener">在 Instagram 觀看</a></blockquote>`;
}

/** Treat a non-positive or non-finite override as the documented default. */
function resolveTimeoutMs(timeoutMs: number | undefined): number {
  return typeof timeoutMs === "number" &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
    ? timeoutMs
    : DEFAULT_OEMBED_TIMEOUT_MS;
}

/** Resolve a single permalink; never throws — a failure becomes `failed: true`. */
async function resolveEmbed(
  url: string,
  { timeoutMs, mode }: Required<InstagramEmbedOptions>,
): Promise<InstagramEmbedData> {
  if (mode === "fixture") {
    return { url, html: instagramFixtureHtml(url), failed: false };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`instagram oEmbed timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const request = (async (): Promise<InstagramEmbedData> => {
    const endpoint = new URL(
      "https://graph.facebook.com/v25.0/instagram_oembed",
    );
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("omitscript", "true");

    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return { url, html: "", failed: true };

    const { html } = (await res.json()) as { html?: unknown };
    if (typeof html !== "string" || html.trim().length === 0) {
      return { url, html: "", failed: true };
    }
    return { url, html, failed: false };
  })();

  try {
    return await Promise.race([request, timedOut]);
  } catch {
    // Timeout, abort, offline build or network/JSON error → link fallback.
    return { url, html: "", failed: true };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Resolve every permalink in `urls` in parallel, preserving input order. Each
 * entry always resolves (failures are captured on the entry, not thrown), so a
 * bad link — or a provider that never answers — degrades gracefully rather than
 * breaking the build.
 */
export function getInstagramEmbeds(
  urls: string[],
  options: InstagramEmbedOptions = {},
): Promise<InstagramEmbedData[]> {
  const resolved: Required<InstagramEmbedOptions> = {
    timeoutMs: resolveTimeoutMs(options.timeoutMs),
    mode: options.mode ?? "live",
  };

  return Promise.all(urls.map((url) => resolveEmbed(url, resolved)));
}
