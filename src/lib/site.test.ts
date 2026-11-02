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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

/**
 * A plain clone stores the config at `.git/config`; a `git worktree` checkout
 * stores a `gitdir:` pointer file instead. Resolve both so the identity guard
 * runs in the isolated worktrees this repository uses for plans.
 *
 * A fork or source tarball can have no `.git` at all. Returning `null` there
 * lets the remote assertion skip instead of throwing at import time; every
 * identity value that does not depend on git still gets guarded.
 */
function readGitConfig(root = process.cwd()): string | null {
  const dotGit = join(root, ".git");
  try {
    if (!existsSync(dotGit)) return null;
    if (statSync(dotGit).isFile()) {
      const pointer = readFileSync(dotGit, "utf8").trim();
      const match = pointer.match(/^gitdir:\s*(.+)$/);
      if (!match) return null;
      const gitDir = resolve(root, match[1]);
      const commonDirFile = join(gitDir, "commondir");
      const commonDir = existsSync(commonDirFile)
        ? resolve(gitDir, readFileSync(commonDirFile, "utf8").trim())
        : gitDir;
      return readFileSync(join(commonDir, "config"), "utf8");
    }
    return readFileSync(join(dotGit, "config"), "utf8");
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readProjectFile("package.json")) as { name: string };
const astroConfig = readProjectFile("astro.config.mjs");
const gitConfig = readGitConfig();

function configuredSite(): string {
  const match = astroConfig.match(/\bsite:\s*["']([^"']+)["']/);
  if (!match) throw new Error("astro.config.mjs has no literal site value");
  return match[1];
}

function remoteRepository(config: string): string {
  const match = config.match(/url\s*=\s*(\S+)/);
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

  it.skipIf(gitConfig === null)(
    "matches the GitHub remote in .git/config",
    () => {
      expect(remoteRepository(gitConfig ?? "")).toBe(REPOSITORY);
      expect(REPOSITORY).toBe(`${pkg.name}/${pkg.name}.github.io`);
    },
  );

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

describe("readGitConfig", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "site-identity-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns null when the checkout has no .git", () => {
    expect(readGitConfig(root)).toBeNull();
  });

  it("reads a plain clone's .git/config", () => {
    const remote = "https://github.com/laooozy/laooozy.github.io.git";
    mkdirSync(join(root, ".git"));
    writeFileSync(
      join(root, ".git", "config"),
      `[remote "origin"]\n\turl = ${remote}\n`,
    );

    expect(readGitConfig(root)).toContain(remote);
  });

  it("follows a worktree gitdir pointer through commondir", () => {
    const remote = "https://github.com/laooozy/laooozy.github.io.git";
    const gitDir = join(root, "worktrees", "site");
    mkdirSync(gitDir, { recursive: true });
    mkdirSync(join(root, "worktrees", "common"), { recursive: true });
    writeFileSync(join(gitDir, "commondir"), "../common\n");
    writeFileSync(
      join(root, "worktrees", "common", "config"),
      `[remote "origin"]\n\turl = ${remote}\n`,
    );
    writeFileSync(join(root, ".git"), `gitdir: ${gitDir}\n`);

    expect(readGitConfig(root)).toContain(remote);
  });

  it("returns null when the config is unreadable", () => {
    mkdirSync(join(root, ".git"));

    expect(readGitConfig(root)).toBeNull();
  });
});
