import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { SITE_UPDATED_FIXTURE_STAMP } from "../../src/lib/io/site-updated-fixture";
import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Focused footer contract for Task 20.
 *
 * The footer's copyright year and update stamp are BUILD-time data passed from
 * `BaseLayout.astro`, never computed in the island. The clock test moves the
 * page's clock a year forward before load: if the component still read
 * `new Date()` the year would drift, while a prop keeps the built value.
 * The spec also pins the stamp the build used: the committed value for a real
 * build, or `SITE_UPDATED_FIXTURE_STAMP` under the E2E fixture build, and the
 * hydration contract.
 */

const FOOTER = "[data-site-footer]";
const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

interface SiteUpdatedJson {
  updatedAt: string;
}

const rawStamp = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/site-updated.json"), "utf8"),
) as SiteUpdatedJson;

const STAMP_ISO =
  process.env.SITE_UPDATED_FIXTURE === "1"
    ? SITE_UPDATED_FIXTURE_STAMP
    : rawStamp.updatedAt;
const STAMP_DISPLAY = `${STAMP_ISO.slice(0, 10)} ${STAMP_ISO.slice(11)}`;
const BUILD_YEAR = new Date().getFullYear();

/** Wait for the `client:load` footer island to finish hydrating. */
async function waitForFooterHydration(page: Page) {
  await page.waitForFunction(() => {
    const islands = Array.from(
      document.querySelectorAll("astro-island[component-url]"),
    );
    const island = islands.find((element) =>
      (element.getAttribute("component-url") ?? "").includes("SiteFooter"),
    );
    return (
      island !== undefined && island !== null && !island.hasAttribute("ssr")
    );
  });
}

/** Collect every console error and uncaught page error for a later assertion. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("footer build-time data", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("year and stamp survive a visitor clock in the next year", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    // Freeze the PAGE clock a year ahead, before any client code runs.
    await page.clock.setFixedTime(
      new Date(`${BUILD_YEAR + 1}-01-01T00:00:00Z`),
    );

    await page.goto("/");
    await waitForFooterHydration(page);

    const footer = page.locator(FOOTER);
    await expect(footer).toContainText(`© ${BUILD_YEAR} laooozy`);
    // The year must NOT follow the visitor's clock.
    await expect(footer).not.toContainText(`© ${BUILD_YEAR + 1}`);

    const time = footer.locator("time");
    await expect(time).toHaveAttribute("datetime", STAMP_ISO);
    await expect(time).toHaveText(STAMP_DISPLAY);

    expect(errors, `console/page errors:\n${errors.join("\n")}`).toEqual([]);
  });
});

for (const width of [390, 1440] as const) {
  test.describe(`footer at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("has no horizontal overflow and captures a screenshot", async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto("/");
      await waitForFooterHydration(page);

      await expectNoHorizontalOverflow(page, `footer @ ${width}px`);
      await expect(page.locator(FOOTER)).toBeVisible();

      mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `task-20-footer-${width}.png`),
        fullPage: true,
      });

      expect(errors, `console/page errors:\n${errors.join("\n")}`).toEqual([]);
    });
  });
}
