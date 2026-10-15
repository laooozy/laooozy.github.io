/**
 * Instagram photo wall — the single list the owner edits.
 *
 * Each entry is a public post permalink (a `/p/<shortcode>/` or `/reel/<…>/`
 * URL). At BUILD time each URL is resolved through Meta's Instagram oEmbed
 * endpoint and the returned blockquote is rendered into the ACG page, so the
 * photo wall is real HTML with no client-side fetch and no API secret.
 *
 * ── How to add / change photos ─────────────────────────────────────────────
 *   1. Open the post on Instagram → ⋯ → "Copy link".
 *   2. Paste the permalink into the array below.
 *   3. Rebuild (`bun run build`).
 * That is the whole workflow. Order in the array = order on the wall.
 *
 * A post that is private, deleted, or has embeds disabled returns HTTP 400 /
 * code 24 from the oEmbed endpoint; that URL then renders as a plain
 * "View on Instagram" link instead of an embed (see InstagramEmbed.astro), so a
 * bad link degrades gracefully rather than breaking the build.
 *
 * NOTE: the two URLs below are the owner's own Instagram permalinks. Set the
 * array to `[]` to render the wall as link-out cards only.
 */
export const instagramPosts: string[] = [
  "https://www.instagram.com/p/DdtBD23yLte/",
  "https://www.instagram.com/p/Dcsnb5YyY0I/",
];
