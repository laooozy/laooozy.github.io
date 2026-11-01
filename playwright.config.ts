import { defineConfig, devices } from "@playwright/test";

/**
 * Browser harness for the shipped artifact.
 *
 * Default mode (no `PLAYWRIGHT_BASE_URL`) is self-contained: the `webServer`
 * builds the site, builds the Pagefind index, and serves `dist/` from a
 * foreground Node server on port 4322. `astro preview` cannot be used here
 * because this Astro version backgrounds it, and a stale dev server must never
 * be able to satisfy the E2E run, so reusing an existing server is opt-in only
 * (`PLAYWRIGHT_REUSE_SERVER=1`).
 *
 * External mode (`PLAYWRIGHT_BASE_URL=http://host:port`) still works for an
 * already-running preview; in that case the harness does not own the server.
 *
 * The build uses `INSTAGRAM_OEMBED_FIXTURE=1`, so the Photography wall renders
 * deterministic local oEmbed markup instead of calling Meta. `E2E_BUILD=1` is
 * exported into the worker environment so specs that need the built artifact
 * (Pagefind search, chrome a11y results) run instead of skipping.
 */

const PORT = 4322;
const HOST = "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

// Workers inherit this process environment; expose the built-artifact mode to
// every spec without requiring the caller to export anything.
if (!usesExternalServer) {
  process.env.E2E_BUILD = "1";
  process.env.SITE_UPDATED_FIXTURE = "1";
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 30_000,
  /**
   * Visual baselines live in `tests/e2e/__screenshots__/` and are tracked.
   * They are pinned to Linux Chromium, DPR 1 and Noto Sans CJK TC; see
   * `tests/e2e/visual.spec.ts` for the full determinism contract. A shift of a
   * single 4px card edge is thousands of pixels, far above the 50px budget, so
   * `maxDiffPixels` is the binding limit (it is min'd with the 0.1% ratio).
   */
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Per-channel colour tolerance (Playwright's default).
      threshold: 0.2,
      maxDiffPixels: 50,
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    baseURL,
    locale: "zh-Hant",
    timezoneId: "Asia/Hong_Kong",
    colorScheme: "dark",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: usesExternalServer
    ? undefined
    : {
        // `bun run e2e:serve` = fixture build -> pagefind -> serve dist.
        command: "bun run e2e:serve",
        url: baseURL,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
        timeout: 240_000,
        env: {
          ...process.env,
          INSTAGRAM_OEMBED_FIXTURE: "1",
          SITE_UPDATED_FIXTURE: "1",
          E2E_BUILD: "1",
          HOST,
          PORT: String(PORT),
        },
      },
});
