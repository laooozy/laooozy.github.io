/**
 * Unit tests for the music port: the real adapter's fetch -> decode -> schema
 * pipeline and the deterministic doubles.
 *
 * `fetch` is stubbed per test; the gzip fixture is produced with Node's `zlib`,
 * so no network is touched. The failure cases pin the typed error contract: a
 * non-ok status is `"http"`, an empty or truncated body is `"decode"` (never a
 * raw `SyntaxError`), and a well-formed but off-schema body is `"invalid"`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";

import {
  MusicFetchError,
  fakeMusic,
  fakeMusicError,
  musicAdapter,
} from "@/adapters/music";
import type { MusicPayload } from "@/lib/domain/music";

const payload: MusicPayload = {
  version: 1,
  generatedAt: "2026-10-31T00:00:00.000Z",
  playlist: {
    id: "PLtestFixture",
    title: "Night loop",
    url: "https://www.youtube.com/playlist?list=PLtestFixture",
  },
  organisations: { kamitsubaki: "Kamitsubaki 神椿" },
  songs: [
    {
      id: "song-1",
      title: "Lunar drift",
      artist: "Kaika",
      artistId: "kaika",
      org: "kamitsubaki",
      thumb: "https://i.ytimg.com/vi/song-1/hqdefault.jpg",
      url: "https://www.youtube.com/watch?v=song-1",
    },
  ],
};

function stubFetch(response: Response | Promise<Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(response)),
  );
}

function jsonBody(value: unknown, status = 200): Response {
  return new Response(new TextEncoder().encode(JSON.stringify(value)), {
    status,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("musicAdapter", () => {
  it("decompresses a gzip body and validates the payload", async () => {
    const gz = new Uint8Array(gzipSync(JSON.stringify(payload)));
    stubFetch(new Response(gz, { status: 200 }));

    const result = await musicAdapter.load();

    expect(result.songs).toHaveLength(1);
    expect(result.songs[0]?.title).toBe("Lunar drift");
  });

  it("accepts a plain-JSON body", async () => {
    stubFetch(jsonBody(payload));

    await expect(musicAdapter.load()).resolves.toEqual(payload);
  });

  it("rejects a non-ok response with code http", async () => {
    stubFetch(new Response("404: Not Found", { status: 404 }));

    const error = await musicAdapter.load().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MusicFetchError);
    expect((error as MusicFetchError).code).toBe("http");
  });

  it("rejects an off-schema payload with code invalid", async () => {
    stubFetch(jsonBody({ version: 2, songs: "nope" }));

    const error = await musicAdapter.load().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MusicFetchError);
    expect((error as MusicFetchError).code).toBe("invalid");
  });

  it("rejects an empty 200 body with code decode, not a raw SyntaxError", async () => {
    stubFetch(new Response("", { status: 200 }));

    const error = await musicAdapter.load().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MusicFetchError);
    expect((error as MusicFetchError).code).toBe("decode");
    expect(error).not.toBeInstanceOf(SyntaxError);
  });

  it("rejects a truncated gzip body with code decode", async () => {
    const gz = new Uint8Array(gzipSync(JSON.stringify(payload)));
    stubFetch(new Response(gz.slice(0, gz.length - 8), { status: 200 }));

    const error = await musicAdapter.load().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MusicFetchError);
    expect((error as MusicFetchError).code).toBe("decode");
  });
});

describe("fakeMusic", () => {
  it("resolves a deep copy the caller cannot mutate", async () => {
    const port = fakeMusic(payload);

    const first = await port.load();
    expect(first).toEqual(payload);
    expect(first).not.toBe(payload);
    expect(first.songs[0]).not.toBe(payload.songs[0]);

    first.songs[0]!.title = "MUTATED";
    first.songs.push({ ...payload.songs[0]! });

    const second = await port.load();
    expect(second).toEqual(payload);
  });
});

describe("fakeMusicError", () => {
  it("rejects with a MusicFetchError", async () => {
    const error = await fakeMusicError()
      .load()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MusicFetchError);
    expect((error as MusicFetchError).code).toBe("http");
  });
});
