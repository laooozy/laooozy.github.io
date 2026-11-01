import { expect, type Page, test } from "@playwright/test";

/**
 * Task 24's additive chrome coverage.
 *
 * The migration tasks already pin their own surfaces in
 * `header.spec.ts`, `search-command.spec.ts`, `language.spec.ts`,
 * `footer.spec.ts` and `scroll-controls.spec.ts`. This spec fills the gaps the
 * plan calls out explicitly instead of repeating them:
 *
 *  - keyboard focus rings are visible on every chrome control at 390 and 1440;
 *  - the palette opens with the macOS ⌘/Meta shortcut (the existing suite only
 *    proves Ctrl+K);
 *  - the desktop nav is server-rendered and reachable with JavaScript disabled;
 *  - keyboard-only disclosure navigation reaches the panel links.
 */

const HEADER = "[data-site-header]";
const SEARCH_TRIGGER = `${HEADER} [data-search-trigger]`;
const LANGUAGE_TRIGGER = "[data-language-trigger]";
const MOBILE_SUMMARY = `${HEADER} details.site-menu summary`;
const MOBILE_PANEL = "[data-site-menu-panel]";
const DIALOG = '[data-slot="command-dialog"]';
const SKIP_LINK = ".skip-link";

interface FocusRing {
  tag: string;
  label: string;
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  boxShadow: string;
}

/** Wait for named Astro islands to finish hydrating (they lose `ssr`). */
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

/** Read the focused element's visual focus treatment from computed styles. */
async function readFocusRing(page: Page): Promise<FocusRing> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) {
      throw new Error("focus-ring probe: no active element");
    }

    const style = getComputedStyle(element);
    const label =
      element.getAttribute("aria-label") ??
      element.textContent?.trim().slice(0, 40) ??
      "";

    return {
      tag: element.tagName.toLowerCase(),
      label,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  });
}

/**
 * A visible focus treatment is either a real outline (style != none, at least
 * 2px) or a non-empty box-shadow ring. Both are legitimate: text controls use
 * the global `:focus-visible` outline and the generated Button uses a ring.
 */
function expectVisibleRing(ring: FocusRing, context: string) {
  const hasOutline =
    ring.outlineStyle !== "none" &&
    ring.outlineWidth >= 2 &&
    ring.outlineColor !== "rgba(0, 0, 0, 0)";
  const hasBoxShadow = ring.boxShadow !== "none" && ring.boxShadow !== "";

  expect(
    hasOutline || hasBoxShadow,
    `${context}: no visible focus ring on <${ring.tag}> "${ring.label}" (outline=${ring.outlineWidth}px ${ring.outlineStyle} ${ring.outlineColor}, box-shadow=${ring.boxShadow})`,
  ).toBe(true);
}

/** Press Tab and assert the expected chrome element receives the ring. */
async function expectNextTabRing(
  page: Page,
  selector: string,
  context: string,
) {
  await page.keyboard.press("Tab");
  await expect(page.locator(selector)).toBeFocused();
  const ring = await readFocusRing(page);
  expectVisibleRing(ring, context);
}

test.describe("chrome focus rings", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every desktop header control shows a visible ring in tab order", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForIslands(page, ["SiteHeader", "LanguageSwitcher"]);

    await expectNextTabRing(page, SKIP_LINK, "skip link");
    await expectNextTabRing(page, `${HEADER} a[href="/"]`, "brand link");
    await expectNextTabRing(
      page,
      `${HEADER} [data-site-nav] a[href="/#about"]`,
      "nav About",
    );
    await expectNextTabRing(
      page,
      `${HEADER} [data-site-nav] a[href="/blog/"]`,
      "nav Blog",
    );
    await expectNextTabRing(
      page,
      `${HEADER} [data-site-nav] a[href="/#contact"]`,
      "nav Contact",
    );
    await expectNextTabRing(
      page,
      `${HEADER} [data-site-nav] a[href="/links/"]`,
      "nav Useful Links",
    );
    await expectNextTabRing(page, SEARCH_TRIGGER, "search trigger");
    await expectNextTabRing(page, LANGUAGE_TRIGGER, "language trigger");
  });
});

test.describe("chrome focus rings (compact)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("compact controls and the disclosure links show visible rings", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForIslands(page, ["SiteHeader", "LanguageSwitcher"]);

    await expectNextTabRing(page, SKIP_LINK, "skip link");
    await expectNextTabRing(page, `${HEADER} a[href="/"]`, "brand link");
    await expectNextTabRing(page, SEARCH_TRIGGER, "search trigger");
    await expectNextTabRing(page, LANGUAGE_TRIGGER, "language trigger");
    await expectNextTabRing(page, MOBILE_SUMMARY, "menu summary");

    // Enter opens the native disclosure; the next Tab reaches the first link.
    await page.keyboard.press("Enter");
    await expect(page.locator(MOBILE_PANEL)).toBeVisible();
    await expectNextTabRing(
      page,
      `${MOBILE_PANEL} a[href="/#about"]`,
      "first menu link",
    );
  });
});

test.describe("command palette shortcut", () => {
  test("Meta+K opens the palette and Escape closes it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await waitForIslands(page, ["SiteHeader", "SearchCommand"]);

    await page.keyboard.press("Meta+K");
    await expect(page.locator(DIALOG)).toBeVisible();
    await expect(page.locator(`${DIALOG} [cmdk-input]`)).toBeFocused();
    await expect(page.locator(DIALOG)).toContainText("快速前往");

    await page.keyboard.press("Escape");
    await expect(page.locator(DIALOG)).toBeHidden();

    // Reopen with the same shortcut: the palette must come back, not stay dead.
    await page.keyboard.press("Meta+K");
    await expect(page.locator(DIALOG)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(DIALOG)).toBeHidden();
  });
});

test.describe("desktop nav without JavaScript", () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });

  test("the server-rendered nav and compact controls are usable", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.locator(`${HEADER} [data-site-nav]`);
    await expect(nav).toBeVisible();

    const links = nav.locator("a");
    await expect(links).toHaveCount(4);
    const hrefs = await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")),
    );
    expect(hrefs).toEqual(["/#about", "/blog/", "/#contact", "/links/"]);

    // The search and language triggers are server-rendered even though their
    // interactions need hydration; the mobile disclosure stays hidden here.
    await expect(page.locator(SEARCH_TRIGGER)).toBeVisible();
    await expect(page.locator(LANGUAGE_TRIGGER)).toBeVisible();
    await expect(page.locator(`${HEADER} details.site-menu`)).toBeHidden();

    // Keyboard focus still paints a ring without JavaScript.
    await page.keyboard.press("Tab");
    await expect(page.locator(SKIP_LINK)).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const ring = await readFocusRing(page);
    expectVisibleRing(ring, "nav link without JavaScript");
  });
});
