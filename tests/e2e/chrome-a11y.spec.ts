import { mkdirSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test, type TestInfo } from "@playwright/test";

/**
 * @a11y — axe-core audit of the fixed chrome.
 *
 * Scope is the chrome only: the header (brand, nav, search trigger, language
 * switcher, mobile disclosure), the skip link, the footer and the single
 * back-to-top control. Page content is a separate surface owned by Task 47, so
 * a content violation recorded below is deferred rather than suppressed.
 *
 * Every state is audited at the two canonical widths the plan names: 390 (the
 * compact chrome) and 1440 (the full chrome). Screenshots land in
 * `.omo/evidence/architecture-artwork-refactor/task-24/` as visual evidence.
 *
 * The search-results state needs the built + Pagefind artifact; it skips on the
 * bare dev server, exactly like `search-command.spec.ts`. Run the whole spec
 * against `bun run build && bun run pagefind && bun run preview` with
 * `PLAYWRIGHT_BASE_URL` set to audit every state.
 */

const BUILT_PREVIEW = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/task-24",
);

const CHROME_SELECTORS = [
  ".skip-link",
  "[data-site-header]",
  "[data-site-footer]",
  "[data-back-to-top]",
];

const SERIOUS = new Set(["serious", "critical"]);

interface ViolationSummary {
  id: string;
  impact: string | null;
  help: string;
  nodes: string[];
}

/** Wait for every `client:*` island on the page to finish hydrating. */
async function waitForIslands(page: Page, components: string[]) {
  await page.waitForFunction((names) => {
    return names.every((name) => {
      const island = document.querySelector(
        `astro-island[component-url*="${name}"]`,
      );
      return island !== null && !island.hasAttribute("ssr");
    });
  }, components);
}

/** Open the mobile disclosure through its native summary. */
async function openMobileMenu(page: Page) {
  await waitForIslands(page, ["SiteHeader"]);
  await page.locator("[data-site-header] details.site-menu summary").click();
  await expect(page.locator("[data-site-menu-panel]")).toBeVisible();
}

/** Open the command palette from the header trigger. */
async function openSearch(page: Page) {
  await waitForIslands(page, ["SiteHeader", "SearchCommand"]);
  await page.locator("[data-site-header] [data-search-trigger]").click();
  await expect(page.locator('[data-slot="command-dialog"]')).toBeVisible();
}

/** Open the language dropdown. */
async function openLanguageMenu(page: Page) {
  await waitForIslands(page, ["SiteHeader", "LanguageSwitcher"]);
  await page.locator("[data-language-trigger]").click();
  await expect(page.locator("[data-language-menu]")).toBeVisible();
}

/**
 * Run axe against the given selectors and return only serious/critical
 * violations. Minor/moderate findings are still printed so a passing run keeps
 * its full audit trail visible in the Playwright output.
 */
async function auditChrome(
  page: Page,
  includes: string[] = CHROME_SELECTORS,
): Promise<ViolationSummary[]> {
  let builder = new AxeBuilder({ page });
  for (const selector of includes) builder = builder.include(selector);

  const results = await builder.analyze();
  const serious = results.violations
    .filter((violation) => SERIOUS.has(violation.impact ?? ""))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    }));

  const advisory = results.violations.filter(
    (violation) => !SERIOUS.has(violation.impact ?? ""),
  );
  if (advisory.length > 0) {
    console.log(
      `axe advisory (non-blocking): ${advisory
        .map((violation) => `${violation.id} (${violation.impact})`)
        .join(", ")}`,
    );
  }

  return serious;
}

/** Assert zero serious/critical violations with an actionable failure body. */
function expectNoSeriousViolations(
  violations: ViolationSummary[],
  context: string,
) {
  expect(
    violations,
    `${context}: ${violations.length} serious/critical axe violation(s)\n${violations
      .map(
        (violation) =>
          `- ${violation.id} (${violation.impact}): ${violation.help}\n  nodes: ${violation.nodes.join(", ")}`,
      )
      .join("\n")}`,
  ).toEqual([]);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}-${testInfo.project.name}.png`),
    fullPage: false,
  });
}

async function gotoHydrated(page: Page, path = "/") {
  await page.goto(path);
  await waitForIslands(page, ["SiteHeader", "SiteFooter", "ScrollControls"]);
}

test.describe("@a11y chrome", () => {
  test.describe("default chrome", () => {
    for (const width of [390, 1440] as const) {
      test(`has zero serious violations at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await gotoHydrated(page);

        await screenshot(page, testInfo, `default-${width}`);
        const violations = await auditChrome(page);
        expectNoSeriousViolations(violations, `default chrome @ ${width}px`);
      });
    }
  });

  test.describe("mobile menu", () => {
    for (const width of [390, 1440] as const) {
      test(`open disclosure at ${width}px has zero serious violations`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await gotoHydrated(page);

        if (width === 1440) {
          // The disclosure is compact-only; at 1440 the desktop nav is the
          // state under audit.
          await expect(page.locator("[data-site-nav]")).toBeVisible();
          await screenshot(page, testInfo, `nav-${width}`);
          const violations = await auditChrome(page);
          expectNoSeriousViolations(violations, `desktop nav @ ${width}px`);
          return;
        }

        await openMobileMenu(page);
        await screenshot(page, testInfo, `menu-open-${width}`);
        const violations = await auditChrome(page);
        expectNoSeriousViolations(violations, `mobile menu @ ${width}px`);
      });
    }
  });

  test.describe("search dialog", () => {
    for (const width of [390, 1440] as const) {
      test(`quick links at ${width}px have zero serious violations`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await gotoHydrated(page);
        await openSearch(page);

        // The popup fades/zooms in for 100ms; wait for the settled paint.
        await page.waitForTimeout(200);
        await screenshot(page, testInfo, `search-quick-links-${width}`);

        const violations = await auditChrome(page, [
          '[data-slot="command-dialog"]',
        ]);
        expectNoSeriousViolations(
          violations,
          `search quick links @ ${width}px`,
        );
      });
    }

    test("results have zero serious violations", async ({ page }, testInfo) => {
      test.skip(
        !BUILT_PREVIEW,
        "search results need the built + Pagefind preview (set PLAYWRIGHT_BASE_URL)",
      );

      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoHydrated(page);
      await openSearch(page);

      const dialog = page.locator('[data-slot="command-dialog"]');
      await dialog.locator("[cmdk-input]").fill("情報系");
      await expect(dialog.locator('[role="status"]')).toContainText(
        "找到 1 筆結果",
      );
      await page.waitForTimeout(200);
      await screenshot(page, testInfo, "search-results-1440");

      const violations = await auditChrome(page, [
        '[data-slot="command-dialog"]',
      ]);
      expectNoSeriousViolations(violations, "search results @ 1440px");
    });
  });

  test.describe("language menu", () => {
    for (const width of [390, 1440] as const) {
      test(`open switcher at ${width}px has zero serious violations`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await gotoHydrated(page);
        await openLanguageMenu(page);

        await page.waitForTimeout(200);
        await screenshot(page, testInfo, `language-open-${width}`);

        const violations = await auditChrome(page, [
          "[data-site-header]",
          "[data-language-menu]",
        ]);
        expectNoSeriousViolations(violations, `language menu @ ${width}px`);
      });
    }
  });

  test.describe("focus states", () => {
    for (const width of [390, 1440] as const) {
      test(`keyboard-focused chrome at ${width}px has zero serious violations`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 900,
        });
        await gotoHydrated(page);

        // First Tab reveals and focuses the skip link; the next stop is the
        // brand, then the search trigger. The audit runs while focus sits on a
        // real chrome control, so any focus-only styling is part of the state.
        await page.keyboard.press("Tab");
        await expect(page.locator(".skip-link")).toBeFocused();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await screenshot(page, testInfo, `focus-chrome-${width}`);

        const violations = await auditChrome(page);
        expectNoSeriousViolations(violations, `keyboard focus @ ${width}px`);
      });
    }
  });
});
