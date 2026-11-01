/**
 * Site identity and URL contracts — the SINGLE source for the brand name, the
 * deployed origin, the GitHub repository, the published music payload URL and
 * the owner's contact handles.
 *
 * Nothing here is retyped: every value is derived from an authoritative file.
 *
 *  - `SITE_NAME` is `name` in `package.json`. Only that one field is imported
 *    by name, so the bundler drops the manifest's scripts and dependency
 *    metadata instead of shipping them to the browser.
 *  - `SITE_URL` is the GitHub Pages origin, `<name>.github.io`, guarded against
 *    the `site` value in `astro.config.mjs` by `assertSiteUrl` (the config is a
 *    build-time file and cannot be imported by this pure module).
 *  - `REPOSITORY` is `<name>/<name>.github.io`; `site.test.ts` proves it equals
 *    the remote in `.git/config` so a package rename cannot silently point the
 *    music payload at a stale repository.
 *
 * PURE and client-safe: this module holds no build-only data (the pipeline's
 * `playlist.json` lives in `src/lib/playlist.ts`) and never touches `fs`,
 * `astro:content` or the DOM.
 */

import { name } from "../../package.json";

/** The package/repository brand identifier (`package.json` `name`). */
export const SITE_NAME: string = name;

/** The deployed origin: GitHub Pages serves the repository at `<name>.github.io`. */
export const SITE_URL = `https://${SITE_NAME}.github.io`;

/**
 * Guard the build config against this module's derived origin.
 *
 * The build cannot import `astro.config.mjs` (it imports `astro/config`), so the
 * test reads the config file text and calls this with its `site` value. A
 * mismatch — a renamed package, a changed Pages domain — throws at test time
 * instead of publishing links to the wrong host.
 */
export function assertSiteUrl(configSite: string): void {
  if (configSite !== SITE_URL) {
    throw new Error(
      `astro.config.mjs site "${configSite}" does not match SITE_URL "${SITE_URL}"`,
    );
  }
}

/** `owner/repository` of the GitHub Pages repository. */
export const REPOSITORY = `${SITE_NAME}/${SITE_NAME}.github.io`;

/** The published music payload on the orphan `music_asset` branch. */
export const MUSIC_URL = `https://raw.githubusercontent.com/${REPOSITORY}/music_asset/music.json.gz`;

/**
 * The owner's contact handles, identical in every locale.
 *
 * The handles are the package brand, so they derive from `SITE_NAME` instead of
 * repeating it (a typo in either handle would be invisible in review).
 */
export const CONTACT = {
  personalIg: SITE_NAME,
  photoIg: `acg.${SITE_NAME}`,
  email: `${SITE_NAME}@outlook.com`,
} as const;
