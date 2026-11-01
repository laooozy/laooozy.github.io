/**
 * Music adapter — a port over the generated playlist payload.
 *
 * The payload is published by the daily workflow to the dedicated data branch
 * and served straight from GitHub's raw host (which allows any origin, so no
 * proxy is needed). It may arrive gzip-compressed or as plain JSON; the adapter
 * sniffs the gzip magic bytes instead of trusting a header, and it never lets a
 * malformed or empty body escape as a raw `SyntaxError`.
 *
 * The published payload URL is single-sourced in `src/lib/site.ts` with the
 * rest of the site identity. `fetch` lives here alone: components and hooks
 * receive `MusicPort` through the injected `ClientDeps`, so the network seam
 * stays swappable.
 */

import type { MusicPayload } from "@/lib/domain/music";
import { parseMusicPayload } from "@/lib/domain/music";
import { MUSIC_URL } from "@/lib/site";

/** How long a load may take before it is aborted. */
const TIMEOUT_MS = 10_000;

/** First two bytes of a gzip member. */
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

/** Why a music load failed: transport, decoding, or schema validation. */
export type MusicFetchErrorCode = "http" | "decode" | "invalid";

/** Typed failure raised by the real adapter (never a raw `SyntaxError`). */
export class MusicFetchError extends Error {
  readonly code: MusicFetchErrorCode;

  constructor(
    code: MusicFetchErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "MusicFetchError";
    this.code = code;
  }
}

/** Music port consumed by the client; the adapter choice is injected. */
export interface MusicPort {
  /** Fetch, decode and validate the published payload. */
  load(): Promise<MusicPayload>;
}

function isGzip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1
  );
}

/** Bytes -> JSON. Gzip is decompressed; anything else is parsed as UTF-8 JSON. */
async function decodeJson(bytes: Uint8Array): Promise<unknown> {
  if (!isGzip(bytes)) {
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  if (typeof DecompressionStream === "undefined") {
    throw new MusicFetchError(
      "decode",
      "music payload is gzip-compressed but DecompressionStream is unavailable",
    );
  }

  // `slice()` returns an ArrayBuffer-backed copy, which `BlobPart` accepts.
  const stream = new Blob([bytes.slice()])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).json();
}

/**
 * Bytes -> validated payload. Every byte/JSON failure becomes code `"decode"`
 * and every schema failure becomes code `"invalid"`, so an empty or truncated
 * 200 body can never leak a raw `SyntaxError`.
 */
async function readPayload(bytes: Uint8Array): Promise<MusicPayload> {
  let raw: unknown;
  try {
    raw = await decodeJson(bytes);
  } catch (error) {
    if (error instanceof MusicFetchError) throw error;
    throw new MusicFetchError("decode", "music payload could not be decoded", {
      cause: error,
    });
  }

  try {
    return parseMusicPayload(raw);
  } catch (error) {
    throw new MusicFetchError(
      "invalid",
      "music payload failed schema validation",
      { cause: error },
    );
  }
}

/** Real adapter over the published `music.json[.gz]`. */
export const musicAdapter: MusicPort = {
  async load() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch(MUSIC_URL, { signal: controller.signal });
      } catch (error) {
        throw new MusicFetchError("http", "music request failed", {
          cause: error,
        });
      }

      // A 404 body is text ("404: Not Found"), not gzip: check the status first.
      if (!response.ok) {
        throw new MusicFetchError(
          "http",
          `music request failed with status ${response.status}`,
        );
      }

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        throw new MusicFetchError(
          "decode",
          "music response body could not be read",
          { cause: error },
        );
      }

      return await readPayload(bytes);
    } finally {
      // Clear on both success and failure: never leave a dangling timer.
      clearTimeout(timer);
    }
  },
};

/** Deterministic double: resolves a deep copy so callers cannot mutate the fixture. */
export function fakeMusic(payload: MusicPayload): MusicPort {
  return {
    load: () => Promise.resolve(structuredClone(payload)),
  };
}

/** Deterministic double that rejects with a `MusicFetchError`. */
export function fakeMusicError(): MusicPort {
  return {
    load: () =>
      Promise.reject(new MusicFetchError("http", "music request failed")),
  };
}
