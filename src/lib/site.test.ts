/**
 * Site identity drift guards.
 *
 * `src/lib/site.ts` derives the brand, origin, repository and payload URLs from
 * authoritative files. These tests read those files independently — the package
 * manifest, the Astro config and `.git/config` — and fail if the derived values
 * drift, so a rename cannot silently publish links to the wrong host or
 * repository.
 *
 * The build-only playlist contract is tested separately in `playlist.test.ts`;
 * this module must not import `playlist.json` or the browser bundle pays for it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertSiteUrl,
  CONTACT,
  MUSIC_URL,
  REPOSITORY,
  SITE_NAME,
  SITE_URL,
} from "./site";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const pkg = JSON.parse(readProjectFile("package.json")) as { name: string };
const astroConfig = readProjectFile("astro.config.mjs");
const gitConfig = readProjectFile(".git/config");

function configuredSite(): string {
  const match = astroConfig.match(/\bsite:\s*["']([^"']+)["']/);
  if (!match) throw new Error("astro.config.mjs has no literal site value");
  return match[1];
}

function remoteRepository(): string {
  const match = gitConfig.match(/url\s*=\s*(\S+)/);
  if (!match) throw new Error(".git/config has no remote url");
  return new URL(match[1]).pathname.replace(/^\//, "").replace(/\.git$/, "");
}

describe("site identity", () => {
  it("takes the name from package.json", () => {
    expect(SITE_NAME).toBe(pkg.name);
  });

  it("derives the origin from the package name and matches astro.config.mjs", () => {
    expect(SITE_URL).toBe(`https://${pkg.name}.github.io`);
    expect(configuredSite()).toBe(SITE_URL);
    expect(() => assertSiteUrl(configuredSite())).not.toThrow();
  });

  it("throws when the configured site drifts", () => {
    expect(() => assertSiteUrl("https://wrong.example")).toThrow(
      /does not match SITE_URL/,
    );
  });

  it("matches the GitHub remote in .git/config", () => {
    expect(remoteRepository()).toBe(REPOSITORY);
    expect(REPOSITORY).toBe(`${pkg.name}/${pkg.name}.github.io`);
  });

  it("builds the music payload URL from that repository", () => {
    expect(MUSIC_URL).toBe(
      `https://raw.githubusercontent.com/${REPOSITORY}/music_asset/music.json.gz`,
    );
  });

  it("derives the contact handles from the package name", () => {
    expect(CONTACT.personalIg).toBe(pkg.name);
    expect(CONTACT.photoIg).toBe(`acg.${pkg.name}`);
    expect(CONTACT.email).toBe(`${pkg.name}@outlook.com`);
  });
});
