/**
 * Build-only playlist contract.
 *
 * `src/lib/playlist.ts` exists so the pipeline's `playlist.json` — an input to
 * the fetch workflow, not runtime data — never rides into the client bundle
 * through `src/lib/site.ts`. These tests pin the value to that source and keep
 * the module build-only: `site.ts`, which the music adapter imports, must not
 * reach for the playlist.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MUSIC_PLAYLIST_URL } from "./playlist";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const playlist = JSON.parse(readProjectFile("scripts/music/playlist.json")) as {
  id: string;
  url: string;
};

describe("music playlist", () => {
  it("takes the public playlist URL from the pipeline source", () => {
    expect(MUSIC_PLAYLIST_URL).toBe(playlist.url);
    expect(MUSIC_PLAYLIST_URL).toMatch(
      /^https:\/\/www\.youtube\.com\/playlist\?list=/,
    );
    expect(MUSIC_PLAYLIST_URL).toContain(playlist.id);
  });

  it("keeps the playlist out of the client-facing site module", () => {
    const siteModule = readProjectFile("src/lib/site.ts");
    expect(siteModule).not.toMatch(/from\s+["'][^"']*playlist\.json["']/);
    expect(siteModule).not.toMatch(/from\s+["'][^"']*playlist["']/);
  });

  it("renders the noscript link from the build-only module", () => {
    const mdx = readProjectFile("src/content/pages/music.mdx");
    expect(mdx).toContain(
      'import { MUSIC_PLAYLIST_URL } from "../../lib/playlist";',
    );
    expect(mdx).toContain("href={MUSIC_PLAYLIST_URL}");
  });
});
