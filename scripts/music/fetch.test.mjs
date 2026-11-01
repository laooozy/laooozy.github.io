/**
 * Failure-contract tests for `fetch.mjs`: they run the real script against a
 * fake `yt-dlp` on PATH and assert that a partial or erroring dump exits
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

/** Prints whatever the case hands over, then exits 0 like `--ignore-errors` can. */
const FAKE_YT_DLP = `#!/usr/bin/env node
process.stdout.write(process.env.FAKE_JSON ?? "");
process.stderr.write(process.env.FAKE_STDERR ?? "");
process.exit(0);
`;

const created = [];

function runFetch(json, stderr = "") {
  const dir = mkdtempSync(join(tmpdir(), "music-fetch-"));
  created.push(dir);

  const fake = join(dir, "yt-dlp");
  writeFileSync(fake, FAKE_YT_DLP);
  chmodSync(fake, 0o755);

  const outDir = join(dir, "out");
  const result = spawnSync(process.execPath, ["scripts/music/fetch.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      MUSIC_OUT_DIR: outDir,
      FAKE_JSON: json,
      FAKE_STDERR: stderr,
    },
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

    const { result, outFile } = runFetch(json);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("refusing a partial playlist");
    expect(existsSync(outFile)).toBe(false);
  });

  it("refuses an exit-0 dump that logged an ERROR line", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 1,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch(json, "ERROR: [youtube] nope\n");

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

    const { result, outFile } = runFetch(json);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("no playlist id");
    expect(existsSync(outFile)).toBe(false);
  });

  it("publishes a gzipped payload when the dump is complete and clean", () => {
    const json = JSON.stringify({
      id: "PLx",
      title: "歌",
      playlist_count: 1,
      entries: [{ id: "a", title: "A" }],
    });

    const { result, outFile } = runFetch(json);

    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);

    const payload = JSON.parse(
      gunzipSync(readFileSync(outFile)).toString("utf8"),
    );
    expect(payload.songs).toHaveLength(1);
    expect(payload.organisations.kamitsubaki).toBe("Kamitsubaki 神椿");
  });
});
