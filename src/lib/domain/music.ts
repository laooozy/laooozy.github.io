/**
 * The music page's data contract and pure filters.
 *
 * The build-time generator (todo 4) writes a normalised payload; the client
 * adapter (todo 8) validates it with `parseMusicPayload` and the page's UI
 * filters the song list with `filterSongs`. Everything here is pure: no
 * content-collection API, no DOM, no network and no display strings (labels
 * come from the payload's `organisations` map).
 */

import { z } from "zod";

/**
 * An absolute `https:` URL on one of the allowed hosts, matched without
 * touching the network. The payload only ever links to YouTube, so anything
 * else is treated as a malformed payload rather than followed.
 */
function httpsUrl(...hosts: string[]) {
  return z.string().refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && hosts.includes(url.hostname);
      } catch {
        return false;
      }
    },
    { message: `must be an absolute https URL on ${hosts.join(" or ")}` },
  );
}

const THUMB_HOSTS = ["i.ytimg.com"] as const;
const YOUTUBE_HOSTS = ["www.youtube.com", "youtube.com"] as const;

/** One song in the playlist. */
export const SongSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string(),
  artistId: z.string(),
  org: z.string().nullable(),
  thumb: httpsUrl(...THUMB_HOSTS),
  url: httpsUrl(...YOUTUBE_HOSTS),
});

/** The generated payload consumed by the music page. */
export const MusicPayloadSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  playlist: z.object({
    id: z.string(),
    title: z.string(),
    url: httpsUrl(...YOUTUBE_HOSTS),
  }),
  /** Organisation id -> display label, so the UI never invents text. */
  organisations: z.record(z.string(), z.string()),
  /** Empty is valid: the UI renders its empty state. */
  songs: z.array(SongSchema).max(5000),
});

export type Song = z.infer<typeof SongSchema>;
export type MusicPayload = z.infer<typeof MusicPayloadSchema>;

/** Validate a raw payload, throwing `ZodError` on malformed input. */
export function parseMusicPayload(raw: unknown): MusicPayload {
  return MusicPayloadSchema.parse(raw);
}

/** Remove one trailing `" - Topic"`; no other trimming. */
export function stripTopicSuffix(artist: string): string {
  const suffix = " - Topic";
  return artist.endsWith(suffix) ? artist.slice(0, -suffix.length) : artist;
}

/** Unique artists by `artistId`, sorted by name with plain code-unit order. */
export function collectArtists(songs: Song[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const song of songs) {
    if (song.artistId === "") continue;
    if (!byId.has(song.artistId)) byId.set(song.artistId, song.artist);
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Unique non-null organisation ids, sorted, labelled from the payload map. */
export function collectOrgs(
  songs: Song[],
  labels: Record<string, string>,
): { id: string; label: string }[] {
  const ids = new Set<string>();
  for (const song of songs) {
    if (song.org !== null) ids.add(song.org);
  }
  return [...ids]
    .sort()
    .map((id) => ({ id, label: Object.hasOwn(labels, id) ? labels[id] : id }));
}

/** The client filter criteria; every field is optional. */
export interface MusicFilters {
  query?: string;
  artistId?: string;
  org?: string;
}

/**
 * Filter songs by a free-text query (`title` or `artist`, case-insensitive)
 * and exact `artistId` / `org` values. Empty criteria return every song in
 * input order.
 */
export function filterSongs(
  songs: Song[],
  { query, artistId, org }: MusicFilters = {},
): Song[] {
  const needle = (query ?? "").normalize("NFKC").trim().toLowerCase();
  const orgId = org === undefined || org === "" ? null : org;
  const wantedArtist =
    artistId === undefined || artistId === "" ? null : artistId;

  return songs.filter((song) => {
    if (wantedArtist !== null && song.artistId !== wantedArtist) return false;
    if (orgId !== null && song.org !== orgId) return false;
    if (needle === "") return true;
    return (
      song.title.toLowerCase().includes(needle) ||
      song.artist.toLowerCase().includes(needle)
    );
  });
}
