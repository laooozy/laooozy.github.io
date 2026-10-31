import { describe, expect, it } from "vitest";

import {
  decodePayload,
  encodePayload,
  listChannels,
  normalizePlaylist,
} from "./normalize.mjs";

const ORGANIZATIONS = {
  kamitsubaki: {
    label: "Kamitsubaki 神椿",
    channelIds: [],
    channelTitleIncludes: ["神椿", "花譜", "KAF", "理芽", "RIM"],
  },
};

/** Six yt-dlp-ish entries: one duplicate, one private, one - Topic, one 神椿, one other, one blank title. */
const RAW = {
  id: "PLtestFixture",
  title: "歌",
  entries: [
    {
      id: "aaaaaaaaa01",
      title: "Foo Song",
      channel: "Foo - Topic",
      channel_id: "UCfoo00000000000000000",
      uploader: "Foo",
      uploader_id: "foo",
      thumbnails: [{ url: "https://i.ytimg.com/vi/aaaaaaaaa01/hqdefault.jpg?sqp=signed" }],
    },
    {
      id: "aaaaaaaaa01",
      title: "Foo Song (duplicate)",
      channel: "Foo - Topic",
      channel_id: "UCfoo00000000000000000",
    },
    {
      id: "aaaaaaaaa02",
      title: "[Private video]",
      channel: "Some Channel",
      channel_id: "UCprivate0000000000000",
    },
    {
      id: "aaaaaaaaa03",
      title: "花譜 - 春を発つ",
      channel: "花譜",
      channel_id: "UCkaf00000000000000000",
      uploader: "花譜",
      uploader_id: "kaf",
    },
    {
      id: "aaaaaaaaa04",
      title: "Another Artist Song",
      channel: "Another Artist",
      channel_id: "UCother0000000000000000",
      uploader: "Another Artist",
      uploader_id: "another",
    },
    {
      id: "aaaaaaaaa05",
      title: "   ",
      channel: "Blank Title Channel",
      channel_id: "UCblank0000000000000000",
    },
  ],
};

const NOW = () => "2026-10-31T14:05:00.000Z";

const payload = () => normalizePlaylist(RAW, ORGANIZATIONS, { now: NOW });

describe("normalizePlaylist", () => {
  it("dedupes by video id, drops private and blank entries, keeps first-seen order", () => {
    const songs = payload().songs;

    expect(songs.map((song) => song.id)).toEqual([
      "aaaaaaaaa01",
      "aaaaaaaaa03",
      "aaaaaaaaa04",
    ]);
    expect(songs).toHaveLength(3);
  });

  it("strips one trailing ' - Topic' suffix from the artist", () => {
    expect(payload().songs[0].artist).toBe("Foo");
  });

  it("maps the Kamitsubaki channel to the organisation and leaves others null", () => {
    const songs = payload().songs;

    expect(songs[1].org).toBe("kamitsubaki");
    expect(songs[2].org).toBeNull();
  });

  it("emits unsigned https thumbnails and per-playlist watch urls", () => {
    const [first] = payload().songs;

    expect(first.thumb).toBe("https://i.ytimg.com/vi/aaaaaaaaa01/mqdefault.jpg");
    expect(first.thumb).not.toContain("sqp=");
    expect(first.url).toBe(
      "https://www.youtube.com/watch?v=aaaaaaaaa01",
    );
  });

  it("builds the payload envelope with the organisation label map", () => {
    const p = payload();

    expect(p.version).toBe(1);
    expect(p.generatedAt).toBe("2026-10-31T14:05:00.000Z");
    expect(p.playlist).toEqual({
      id: "PLtestFixture",
      title: "歌",
      url: "https://www.youtube.com/playlist?list=PLtestFixture",
    });
    expect(p.organisations).toEqual({ kamitsubaki: "Kamitsubaki 神椿" });
  });

  it("falls back to 歌 for a missing playlist title and returns an empty song list for no entries", () => {
    const p = normalizePlaylist({ id: "PLtestFixture" }, ORGANIZATIONS, {
      now: NOW,
    });

    expect(p.playlist.title).toBe("歌");
    expect(p.songs).toEqual([]);
  });
});

describe("encodePayload / decodePayload", () => {
  it("gzip round-trips the payload through the DECOMPRESSED value", () => {
    const encoded = encodePayload(payload());

    expect(Buffer.isBuffer(encoded)).toBe(true);
    expect(encoded[0]).toBe(0x1f);
    expect(encoded[1]).toBe(0x8b);
    expect(decodePayload(encoded)).toEqual(payload());
  });
});

describe("listChannels", () => {
  it("returns distinct { id, title } pairs in first-seen order", () => {
    expect(listChannels(RAW)).toEqual([
      { id: "UCfoo00000000000000000", title: "Foo - Topic" },
      { id: "UCprivate0000000000000", title: "Some Channel" },
      { id: "UCkaf00000000000000000", title: "花譜" },
      { id: "UCother0000000000000000", title: "Another Artist" },
      { id: "UCblank0000000000000000", title: "Blank Title Channel" },
    ]);
  });
});

describe("normalizePlaylist org matching", () => {
  const normalizeChannel = (channel) =>
    normalizePlaylist(
      {
        id: "PLtestFixture",
        entries: [{ id: "aaaaaaaaa09", title: "Song", channel }],
      },
      ORGANIZATIONS,
      { now: NOW },
    ).songs[0];

  it("does not match an ASCII needle inside a longer token", () => {
    expect(normalizeChannel("KAFKA").org).toBeNull();
  });

  it("matches an ASCII needle as a whole token", () => {
    expect(normalizeChannel("KAF - Topic").org).toBe("kamitsubaki");
  });
});

describe("normalizePlaylist artistId fallback", () => {
  it("gives a channel id-less entry a non-empty name-prefixed artistId", () => {
    const [song] = normalizePlaylist(
      {
        id: "PLtestFixture",
        entries: [
          {
            id: "aaaaaaaaa10",
            title: "Live",
            channel: "【Re:AcT /リアクト】公式チャンネル",
          },
        ],
      },
      ORGANIZATIONS,
      { now: NOW },
    ).songs;

    expect(song.artistId).not.toBe("");
    expect(song.artistId).toBe("name:【Re:AcT /リアクト】公式チャンネル");
  });
});
