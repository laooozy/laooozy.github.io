/**
 * The owner's YouTube playlist, taken from the music pipeline's own source.
 *
 * BUILD-ONLY. `scripts/music/playlist.json` is an input to the fetch workflow,
 * not runtime data: the client gets the authoritative playlist from the
 * published payload. Keeping it in its own module means the id/URL never ride
 * along into the client bundle through `src/lib/site.ts` (which the music
 * adapter imports for `MUSIC_URL`).
 *
 * Imported only by build-time content (`content/pages/music.mdx`) for the
 * `<noscript>` link and by `playlist.test.ts`; no client module may import it.
 */

import playlist from "../../scripts/music/playlist.json";

/** The public YouTube playlist URL for the no-JavaScript fallback link. */
export const MUSIC_PLAYLIST_URL: string = playlist.url;
