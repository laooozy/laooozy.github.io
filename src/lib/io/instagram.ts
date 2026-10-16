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
 * `pages/acg.astro`). A private / deleted / embed-disabled post returns HTTP 400
 * with `code 24`; that URL degrades to an empty `html` + `failed: true` so an
 * offline build or a bad permalink renders a plain link-out instead of a hole.
 *
 * This is the I/O edge (network), so it lives outside the pure domain. The
 * result is plain, serializable data the AcgPage island receives as props.
 */

/** One resolved Instagram embed: the source URL plus its build-time result. */
export interface InstagramEmbedData {
  /** The public Instagram permalink this embed resolves. */
  url: string;
  /** The oEmbed blockquote HTML, or `""` when the request failed. */
  html: string;
  /** `true` when the oEmbed request errored or returned a non-OK status. */
  failed: boolean;
}

/** Resolve a single permalink; never throws — a failure becomes `failed: true`. */
async function resolveEmbed(url: string): Promise<InstagramEmbedData> {
  const endpoint = new URL("https://graph.facebook.com/v25.0/instagram_oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("omitscript", "true");

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return { url, html: "", failed: true };
    const { html } = (await res.json()) as { html?: unknown };
    return {
      url,
      html: typeof html === "string" ? html : "",
      failed: false,
    };
  } catch {
    // Offline build or network error → render the link fallback.
    return { url, html: "", failed: true };
  }
}

/**
 * Resolve every permalink in `urls` in parallel, preserving input order. Each
 * entry always resolves (failures are captured on the entry, not thrown), so a
 * bad link degrades gracefully rather than breaking the build.
 */
export function getInstagramEmbeds(
  urls: string[],
): Promise<InstagramEmbedData[]> {
  return Promise.all(urls.map(resolveEmbed));
}
