/**
 * Built-artifact detection for the E2E suite.
 *
 * `playwright.config.ts` builds and serves `dist/` (plus the Pagefind index) by
 * default and exports `E2E_BUILD=1` to the workers. External-server mode
 * (`PLAYWRIGHT_BASE_URL=...`) is assumed to be a built preview as well, exactly
 * as the older specs documented. Specs that need the generated index should
 * gate on this value and name the requirement in their skip reason instead of
 * silently passing against a source-only server.
 */
export const HAS_BUILT_ARTIFACT = Boolean(
  process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BUILD === "1",
);

/** One shared message so a skip always says how to satisfy it. */
export const BUILT_ARTIFACT_HINT =
  "needs the built dist/ + Pagefind artifact (run `bun run test:e2e`, or set PLAYWRIGHT_BASE_URL to a built preview)";
