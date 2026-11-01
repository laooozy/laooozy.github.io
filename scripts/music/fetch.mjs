/**
 * Fetches the playlist with the `yt-dlp` binary on PATH, normalises the dump and
 * writes the gzipped wire payload consumed by `src/adapters/music.ts`.
 *
 * The playlist literal lives in `scripts/music/playlist.json`; this script never
 * retypes it. `--playlist <url>` exists only so the failure path can be
 * exercised locally. `--list-channels` prints the distinct channels seen in the
 * same yt-dlp run and writes nothing.
 *
 * Node builtins only: this runs before any dependency install on the runner.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertPublishable,
  encodePayload,
  listChannels,
  normalizePlaylist,
} from "./normalize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUT_DIR = process.env.MUSIC_OUT_DIR
  ? resolve(process.env.MUSIC_OUT_DIR)
  : resolve(REPO_ROOT, ".music-out");
const OUT_FILE = resolve(OUT_DIR, "music.json.gz");

/**
 * Hard stop: a hung extractor must not hold the runner forever. The env
 * override exists only so the timeout failure test can finish in milliseconds;
 * production leaves it unset.
 */
function resolveTimeoutMs() {
  const override = Number(process.env.MUSIC_YTDLP_TIMEOUT_MS);
  return Number.isFinite(override) && override > 0 ? override : 10 * 60 * 1000;
}

const YT_DLP_TIMEOUT_MS = resolveTimeoutMs();

const YT_DLP_ARGS = [
  "--flat-playlist",
  "--dump-single-json",
  "--no-warnings",
  "--ignore-errors",
  "--retries",
  "3",
];

function readPlaylist() {
  const raw = readFileSync(resolve(HERE, "playlist.json"), "utf8");
  return JSON.parse(raw);
}

function readOrganisations() {
  const raw = readFileSync(resolve(HERE, "organisations.json"), "utf8");
  return JSON.parse(raw);
}

function fail(message) {
  process.stderr.write(`fetch.mjs: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { playlist: null, listChannels: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--list-channels") {
      options.listChannels = true;
      continue;
    }
    if (arg === "--playlist") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        fail("--playlist requires a URL argument");
      }
      options.playlist = value;
      index += 1;
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }

  return options;
}

function runYtDlp(url) {
  const result = spawnSync("yt-dlp", [...YT_DLP_ARGS, url], {
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
    timeout: YT_DLP_TIMEOUT_MS,
  });

  if (result.error) {
    const code = result.error.code ? ` (${result.error.code})` : "";
    fail(`could not run yt-dlp${code}: ${result.error.message}`);
  }

  // A signal kill leaves `status` null: that is a failure, not a success.
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    fail(`yt-dlp exited with status ${String(result.status)}`);
  }

  const stderr = result.stderr ?? "";
  const stdout = result.stdout ?? "";

  // `--ignore-errors` can exit 0 after individual entries failed; the extractor
  // still reports them as `ERROR:` lines, which means the dump is partial.
  if (/^\s*ERROR:/m.test(stderr)) {
    process.stderr.write(stderr);
    fail("yt-dlp reported errors; refusing to publish a partial playlist");
  }

  if (stdout.trim().length === 0) {
    process.stderr.write(stderr);
    fail("yt-dlp produced no output");
  }

  let raw;
  try {
    raw = JSON.parse(stdout);
  } catch (error) {
    fail(`could not parse yt-dlp JSON: ${error.message}`);
  }

  if (!raw || typeof raw !== "object") {
    fail("yt-dlp output is not an object");
  }

  if (typeof raw.id !== "string" || raw.id.length === 0) {
    fail("yt-dlp output has no playlist id");
  }

  // A missing or string count cannot prove the dump is complete, so it is a
  // failure rather than a silent pass (the old code only compared numbers).
  if (
    typeof raw.playlist_count !== "number" ||
    !Number.isFinite(raw.playlist_count)
  ) {
    fail("yt-dlp output has no numeric playlist_count");
  }

  if (!Array.isArray(raw.entries)) {
    fail("yt-dlp output has no entries array");
  }

  if (raw.entries.length < raw.playlist_count) {
    fail(
      `yt-dlp returned ${raw.entries.length}/${raw.playlist_count} entries; refusing a partial playlist`,
    );
  }

  return raw;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const playlist = readPlaylist();
  const organisations = readOrganisations();
  const url = options.playlist ?? playlist.url;

  const raw = runYtDlp(url);
  const channels = listChannels(raw);

  if (options.listChannels) {
    process.stdout.write(`${JSON.stringify(channels, null, 2)}\n`);
    return;
  }

  const payload = normalizePlaylist(raw, organisations, {
    now: new Date().toISOString(),
  });

  try {
    assertPublishable(payload);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, encodePayload(payload));

  process.stdout.write(
    `${JSON.stringify(
      {
        songs: payload.songs.length,
        channels: channels.length,
        generatedAt: payload.generatedAt,
      },
      null,
      2,
    )}\n`,
  );
}

main();
