/**
 * The footer stamp rendered by the offline E2E/visual build.
 *
 * Kept in a leaf module with no JSON import so Playwright's ESM loader can
 * import it from a spec; `site-updated.ts` reads it when
 * `SITE_UPDATED_FIXTURE=1`.
 */
export const SITE_UPDATED_FIXTURE_STAMP = "2026-01-01T00:00";
