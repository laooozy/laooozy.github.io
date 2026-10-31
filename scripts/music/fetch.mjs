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
  encodePayload,
  listChannels,
  normalizePlaylist,
} from "./normalize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUT_DIR = resolve(REPO_ROOT, ".music-out");
const OUT_FILE = resolve(OUT_DIR, "music.json.gz");

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
  const raw = readFileSync(resolve(HERE, "organizations.json"), "utf8");
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
  });

  if (result.error) {
    fail(`could not run yt-dlp: ${result.error.message}`);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    fail(`yt-dlp exited with status ${result.status}`);
  }

  const stdout = result.stdout ?? "";
  if (stdout.trim().length === 0) {
    process.stderr.write(result.stderr ?? "");
    fail("yt-dlp produced no output");
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`could not parse yt-dlp JSON: ${error.message}`);
  }
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

  if (!Array.isArray(payload.songs) || payload.songs.length === 0) {
    fail("refusing to publish an empty payload");
  }

  if (payload.songs.some((song) => !song.title || !song.title.trim())) {
    fail("refusing to publish a payload with a blank title");
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
