/**
 * Unit tests for the pure music domain: the payload schema and the artist /
 * organisation / song filters. No I/O, no DOM, no `astro:content`.
 */
import { describe, expect, it } from "vitest";
import {
  MusicPayloadSchema,
  SongSchema,
  collectArtists,
  collectOrgs,
  filterSongs,
  parseMusicPayload,
  stripTopicSuffix,
  type Song,
} from "./music";

/** Four songs, two artists, one organisation, fixed order. */
const songs: Song[] = [
  {
    id: "aaaaaaaaaaa",
    title: "花譜 - 告白",
    artist: "花譜",
    artistId: "flower",
    org: "kamitsubaki",
    thumb: "https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=aaaaaaaaaaa&list=PLtest",
  },
  {
    id: "bbbbbbbbbbb",
    title: "夜明け",
    artist: "花譜",
    artistId: "flower",
    org: "kamitsubaki",
    thumb: "https://i.ytimg.com/vi/bbbbbbbbbbb/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=bbbbbbbbbbb&list=PLtest",
  },
  {
    id: "ccccccccccc",
    title: "RIM - ユメ",
    artist: "RIM",
    artistId: "rim",
    org: "kamitsubaki",
    thumb: "https://i.ytimg.com/vi/ccccccccccc/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=ccccccccccc&list=PLtest",
  },
  {
    id: "ddddddddddd",
    title: "Outside",
    artist: "Some Artist",
    artistId: "some-artist",
    org: null,
    thumb: "https://i.ytimg.com/vi/ddddddddddd/mqdefault.jpg",
    url: "https://www.youtube.com/watch?v=ddddddddddd&list=PLtest",
  },
];

const labels: Record<string, string> = {
  kamitsubaki: "Kamitsubaki 神椿",
};

describe("SongSchema", () => {
  it("accepts a song with a null organisation", () => {
    expect(SongSchema.safeParse(songs[3]).success).toBe(true);
  });

  it("rejects a non-https thumbnail", () => {
    expect(
      SongSchema.safeParse({ ...songs[0], thumb: "http://example.com/a.jpg" })
        .success,
    ).toBe(false);
  });
});

describe("parseMusicPayload", () => {
  it("parses an empty song list", () => {
    const payload = parseMusicPayload({
      version: 1,
      generatedAt: "2026-10-31T14:05",
      playlist: { id: "PLtest", title: "歌", url: "https://example.com/p" },
      organisations: labels,
      songs: [],
    });
    expect(payload.version).toBe(1);
    expect(payload.songs).toEqual([]);
  });

  it("throws on the wrong version", () => {
    expect(() =>
      parseMusicPayload({
        version: 2,
        generatedAt: "2026-10-31T14:05",
        playlist: { id: "PLtest", title: "歌", url: "https://example.com/p" },
        organisations: {},
        songs: [],
      }),
    ).toThrow();
  });

  it("throws on a blank title", () => {
    expect(() =>
      MusicPayloadSchema.parse({
        version: 1,
        generatedAt: "2026-10-31T14:05",
        playlist: { id: "PLtest", title: "歌", url: "https://example.com/p" },
        organisations: {},
        songs: [{ ...songs[0], title: "" }],
      }),
    ).toThrow();
  });
});

describe("stripTopicSuffix", () => {
  it("removes one trailing ' - Topic'", () => {
    expect(stripTopicSuffix("Some Artist - Topic")).toBe("Some Artist");
  });

  it("leaves other text untouched", () => {
    expect(stripTopicSuffix("Some Artist")).toBe("Some Artist");
  });
});

describe("collectArtists", () => {
  it("dedupes by artistId and sorts by plain code-unit name order", () => {
    expect(collectArtists(songs)).toEqual([
      { id: "rim", name: "RIM" },
      { id: "some-artist", name: "Some Artist" },
      { id: "flower", name: "花譜" },
    ]);
  });
});

describe("collectOrgs", () => {
  it("collects the non-null org ids, sorted, with labels from the map", () => {
    expect(collectOrgs(songs, labels)).toEqual([
      { id: "kamitsubaki", label: "Kamitsubaki 神椿" },
    ]);
  });

  it("falls back to the id when the label map is missing it", () => {
    expect(collectOrgs(songs, {})).toEqual([
      { id: "kamitsubaki", label: "kamitsubaki" },
    ]);
  });
});

describe("filterSongs", () => {
  it("returns every song in input order when no criteria are set", () => {
    expect(filterSongs(songs, {}).map((song) => song.id)).toEqual([
      "aaaaaaaaaaa",
      "bbbbbbbbbbb",
      "ccccccccccc",
      "ddddddddddd",
    ]);
  });

  it("matches a query against the title", () => {
    expect(
      filterSongs(songs, { query: "夜明" }).map((song) => song.id),
    ).toEqual(["bbbbbbbbbbb"]);
  });

  it("matches a query against the artist", () => {
    expect(filterSongs(songs, { query: "rim" }).map((song) => song.id)).toEqual(
      ["ccccccccccc"],
    );
  });

  it("trims a full-width space around the query", () => {
    expect(
      filterSongs(songs, { query: "\u3000花譜\u3000" }).map((song) => song.id),
    ).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
  });

  it("combines a query with an exact artistId", () => {
    expect(
      filterSongs(songs, { query: "花", artistId: "rim" }).map(
        (song) => song.id,
      ),
    ).toEqual([]);
    expect(
      filterSongs(songs, { query: "花", artistId: "flower" }).map(
        (song) => song.id,
      ),
    ).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
  });

  it("filters by an exact org id", () => {
    expect(filterSongs(songs, { org: "kamitsubaki" })).toHaveLength(3);
  });
});
