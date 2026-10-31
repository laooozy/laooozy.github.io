/**
 * Normalises a yt-dlp playlist dump into the wire payload the site consumes.
 *
 * This is a standalone build script (no `astro:content`, no TS imports from
 * `src/`) so it can run with bare Node before the site is built. The payload
 * shape mirrors `MusicPayloadSchema` in `src/lib/domain/music.ts`; keep the two
 * in sync when either changes.
 */

import { gzipSync, gunzipSync } from "node:zlib";

const PRIVATE_OR_DELETED = /^\[(Private|Deleted) video\]$/;
const TOPIC_SUFFIX = " - Topic";

/**
 * Removes ONE trailing `" - Topic"`, matching `stripTopicSuffix` in
 * `src/lib/domain/music.ts`. Duplicated on purpose: importing TS from `src/`
 * into a bare `.mjs` script is not available at this layer.
 */
function stripTopicSuffixLocal(artist) {
  return artist.endsWith(TOPIC_SUFFIX)
    ? artist.slice(0, -TOPIC_SUFFIX.length)
    : artist;
}

const ASCII_ALNUM = /[A-Za-z0-9]/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ASCII needles are short artist abbreviations (`KAF`, `RIM`, `KOKO`), so they
 * must match a whole token: `KAF` matches `KAF` and `KAF - Topic` but not
 * `KAFKA`. Non-ASCII needles (`花譜`, `神椿`) are unambiguous and stay substring
 * matches.
 */
function nameIncludesNeedle(name, needle) {
  if (ASCII_ALNUM.test(needle)) {
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9])${escapeRegExp(needle)}([^A-Za-z0-9]|$)`,
    );
    return pattern.test(name);
  }
  return name.includes(needle);
}

/**
 * `kamitsubaki` when the channel id is allowlisted or the channel/uploader name
 * contains one of the configured needles, else `null`.
 */
function resolveOrg(orgs, channelId, names) {
  for (const [orgId, org] of Object.entries(orgs)) {
    const ids = org.channelIds ?? [];
    if (channelId && ids.includes(channelId)) return orgId;
    const needles = org.channelTitleIncludes ?? [];
    if (
      names.some((name) =>
        needles.some((needle) => nameIncludesNeedle(name, needle)),
      )
    ) {
      return orgId;
    }
  }
  return null;
}

/**
 * Turns a yt-dlp JSON dump into a normalised payload.
 *
 * @param {unknown} raw yt-dlp output: `{ id?, title?, entries? }`
 * @param {Record<string, { label: string, channelIds?: string[], channelTitleIncludes?: string[] }>} organizations
 * @param {{ now?: () => Date | string }} [options]
 */
export function normalizePlaylist(raw, organizations, { now } = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const entries = Array.isArray(source.entries) ? source.entries : [];
  const playlistId =
    typeof source.id === "string" && source.id.length > 0 ? source.id : "";

  const seen = new Set();
  const songs = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!id) continue;

    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (!title) continue;
    if (PRIVATE_OR_DELETED.test(title)) continue;

    if (seen.has(id)) continue;
    seen.add(id);

    const channel = typeof entry.channel === "string" ? entry.channel : "";
    const uploader = typeof entry.uploader === "string" ? entry.uploader : "";
    const channelId =
      typeof entry.channel_id === "string" ? entry.channel_id : "";
    const uploaderId =
      typeof entry.uploader_id === "string" ? entry.uploader_id : "";

    const rawArtist = channel || uploader;
    const org = resolveOrg(organizations ?? {}, channelId, [
      channel,
      uploader,
    ].filter(Boolean));

    songs.push({
      id,
      title,
      artist: stripTopicSuffixLocal(rawArtist),
      // `name:` keeps a channel-less artist from colliding with the UI's empty
      // "all" filter value while staying a string, not a new payload shape.
      artistId:
        channelId || uploaderId || (rawArtist ? `name:${rawArtist}` : ""),
      org,
      thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}&list=${playlistId}`,
    });
  }

  const generatedAt =
    typeof now === "function"
      ? new Date(now()).toISOString()
      : typeof now === "string"
        ? new Date(now).toISOString()
        : now instanceof Date
          ? now.toISOString()
          : new Date().toISOString();

  return {
    version: 1,
    generatedAt,
    playlist: {
      id: playlistId,
      title:
        typeof source.title === "string" && source.title.trim().length > 0
          ? source.title.trim()
          : "歌",
      url: `https://www.youtube.com/watch?list=${playlistId}`,
    },
    organisations: Object.fromEntries(
      Object.entries(organizations ?? {}).map(([id, org]) => [id, org.label]),
    ),
    songs,
  };
}

/** Gzip the payload as UTF-8 JSON at maximum compression. */
export function encodePayload(payload) {
  return gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 });
}

/** Inverse of {@link encodePayload}. */
export function decodePayload(buffer) {
  return JSON.parse(gunzipSync(buffer).toString("utf8"));
}

/** The distinct `{ id, title }` channel pairs in a yt-dlp dump, first-seen order. */
export function listChannels(raw) {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  const seen = new Set();
  const channels = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const id =
      (typeof entry.channel_id === "string" && entry.channel_id) ||
      (typeof entry.uploader_id === "string" && entry.uploader_id) ||
      "";
    const title =
      (typeof entry.channel === "string" && entry.channel) ||
      (typeof entry.uploader === "string" && entry.uploader) ||
      "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    channels.push({ id, title });
  }

  return channels;
}
