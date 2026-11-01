/**
 * Failure-contract tests for `fetch.mjs`: they run the real script against a
 * fake `yt-dlp` on PATH and assert that a partial, empty or erroring run exits
 * non-zero and writes no payload. No network, no real extractor.
 */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { afterEach, describe, expect, it } from "vitest";

import { assertPublishable } from "./normalize.mjs";

/** Prints whatever the case hands over, then exits with the requested code. */
const FAKE_YT_DLP = `#!/usr/bin/env node
process.stdout.write(process.env.FAKE_JSON ?? "");
process.stderr.write(process.env.FAKE_STDERR ?? "");
process.exit(Number(process.env.FAKE_EXIT ?? "0"));
`;

/** Never exits: the parent's spawnSync timeout has to kill it. */
const HANGING_YT_DLP = `#!/usr/bin/env node
setInterval(() => {}, 1000);
`;

const created = [];

function runFetch({
  json = "",
  stderr = "",
  exitCode = 0,
  includeYtDlp = true,
  script = FAKE_YT_DLP,
  timeoutMs,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "music-fetch-"));
  created.push(dir);

  if (includeYtDlp) {
    const fake = join(dir, "yt-dlp");
    writeFileSync(fake, script);
    chmodSync(fake, 0o755);
  }

  const outDir = join(dir, "out");
  const env = {
    ...process.env,
    // Keep the real PATH so a fake's `#!/usr/bin/env node` finds node; the
    // missing-binary case deliberately drops it.
    PATH: includeYtDlp ? `${dir}:${process.env.PATH}` : dir,
    MUSIC_OUT_DIR: outDir,
    FAKE_JSON: json,
    FAKE_STDERR: stderr,
    FAKE_EXIT: String(exitCode),
  };
  delete env.MUSIC_YTDLP_TIMEOUT_MS;
  if (timeoutMs !== undefined) {
    env.MUSIC_YTDLP_TIMEOUT_MS = String(timeoutMs);
  }

  const result = spawnSync(process.execPath, ["scripts/music/fetch.mjs"], {
    encoding: "utf8",
    env,
  });

  return { result, outFile: join(outDir, "music.json.gz") };
}

afterEach(() => {
  while (created.length > 0) {
    rmSync(created.pop(), { recursive: true, force: true });
  }
});

describe("fetch.mjs failure contract", () => {
  it("refuses a dump with fewer entries than playlist_count", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 5,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("refusing a partial playlist");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses a non-numeric playlist_count instead of skipping the check", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: "1",
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no numeric playlist_count");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses a dump with no playlist_count at all", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no numeric playlist_count");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses a dump whose entries are not an array", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 1,
      entries: { id: "a", title: "A" },
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no entries array");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses an empty playlist and writes no payload", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 0,
      entries: [],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("empty payload");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses a payload with a blank title through the pure guard", () => {
    // normalizePlaylist drops blank entries, so the CLI cannot reach this
    // branch; the exported guard is the only place it is observable.
    expect(() => assertPublishable({ songs: [{ title: "   " }] })).toThrow(
      "blank title",
    );
  });

  it("refuses an exit-0 dump that logged an ERROR line", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 1,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({
      json,
      stderr: "ERROR: [youtube] nope\n",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("reported errors");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses a dump without a playlist id", () => {
    const json = JSON.stringify({
      title: "歌",
      playlist_count: 1,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no playlist id");
    expect(existsSync(outFile)).toBe(false);
  });

  it("exits non-zero when yt-dlp exits non-zero", () => {
    const { result, outFile } = runFetch({ exitCode: 3 });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("exited with status 3");
    expect(existsSync(outFile)).toBe(false);
  });

  it("exits non-zero when the yt-dlp binary is missing", () => {
    const { result, outFile } = runFetch({ includeYtDlp: false });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("could not run yt-dlp");
    expect(existsSync(outFile)).toBe(false);
  });

  it("kills a hanging yt-dlp on the test timeout and writes no payload", () => {
    const started = Date.now();
    const { result, outFile } = runFetch({
      script: HANGING_YT_DLP,
      timeoutMs: 50,
    });

    expect(Date.now() - started).toBeLessThan(5000);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("could not run yt-dlp");
    expect(existsSync(outFile)).toBe(false);
  });

  it("publishes a gzipped payload when the dump is complete and clean", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 1,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch({ json });

    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);

    const payload = JSON.parse(
      gunzipSync(readFileSync(outFile)).toString("utf8"),
    );
    expect(payload.songs).toHaveLength(1);
    expect(payload.organisations.kamitsubaki).toBe("Kamitsubaki 神椿");
  });
});
