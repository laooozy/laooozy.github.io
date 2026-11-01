import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const HOST = "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

/**
 * Browser harness for the later Wave-1 tasks.
 *
 * Scenarios that must prove the *built artifact* (fonts, CSS tokens, Lighthouse)
 * run `bun run build` first and point `PLAYWRIGHT_BASE_URL` at a static server
 * (for example `bun run preview`). Development iteration uses the webServer
 * below. Both modes share the same Chromium projects and `baseURL`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
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
        command: `bun run dev -- --host ${HOST} --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
