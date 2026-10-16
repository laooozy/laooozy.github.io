/**
 * InstagramEmbed — one Instagram post, resolved at BUILD time.
 *
 * The network fetch (Meta's oEmbed endpoint) lives in `@/lib/io/instagram`
 * (`getInstagramEmbeds`), called by `pages/acg.astro`. This component is purely
 * presentational: it receives the already-resolved `{ url, html, failed }` and
 * either injects the official blockquote (when `html` is present) or renders a
 * plain link-out fallback (when the permalink could not be embedded), so a bad
 * link or an offline build degrades gracefully instead of shipping a hole.
 *
 * Props
 *  - url: string      public Instagram post permalink (fallback link target)
 *  - html: string     the oEmbed blockquote HTML, or "" on failure
 *  - failed: boolean  marks the fallback with `data-embed-failed`
 */
import type { InstagramEmbedData } from "@/lib/io/instagram";

type InstagramEmbedProps = InstagramEmbedData;

export default function InstagramEmbed({
  url,
  html,
  failed,
}: InstagramEmbedProps) {
  if (html) {
    return (
      <figure className="ig-embed" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return (
    <a
      className="ig-fallback"
      href={url}
      target="_blank"
      rel="noopener"
      aria-label="View this post on Instagram"
      data-embed-failed={failed ? "" : undefined}
    >
      <span className="ig-fallback__glyph" aria-hidden="true">
        ↗
      </span>
      <span className="ig-fallback__label">View this post on Instagram</span>
    </a>
  );
}
