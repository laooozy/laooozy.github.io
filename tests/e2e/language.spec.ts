import { expect, type Page, test } from "@playwright/test";

import { expectTouchTarget } from "./helpers/target-size";

/**
 * Focused language-switcher contract for Task 19.
 *
 * Pins the pieces the shadcn DropdownMenu migration owns: all three locales
 * actually switch `<html lang>`, `data-locale` and the persisted locale; the
 * page hydrates without a mismatch; the radio menu is keyboard-operable with
 * Escape/focus return; selecting the current locale does not write again; and
 * the compact trigger is a 44px target at 390.
 */

const TRIGGER = "[data-language-trigger]";
const MENU = "[data-language-menu]";
const LABEL = "[data-language-label]";

type LocaleCode = "zh-hant" | "zh-hans" | "en";

const LOCALE_NAMES: Record<LocaleCode, string> = {
  "zh-hant": "繁體中文",
  "zh-hans": "简体中文",
  en: "English",
};

const LANG_ATTR: Record<LocaleCode, string> = {
  "zh-hant": "zh-Hant",
  "zh-hans": "zh-Hans",
  en: "en",
};

/**
 * Wait for the nested switcher island to hydrate. Astro removes the island's
 * `ssr` marker on hydration, exactly as the header spec does.
 */
async function waitForSwitcherHydration(page: Page) {
  await page.waitForFunction(() => {
    const islands = Array.from(document.querySelectorAll("astro-island"));
    const island = islands.find((element) =>
      (element.getAttribute("component-url") ?? "").includes(
        "LanguageSwitcher",
      ),
    );
    return (
      island !== null && island !== undefined && !island.hasAttribute("ssr")
    );
  });
}

async function openMenu(page: Page) {
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();
}

async function expectLocale(page: Page, code: LocaleCode) {
  await expect(page.locator("html")).toHaveAttribute("lang", LANG_ATTR[code]);
  await expect(page.locator("html")).toHaveAttribute("data-locale", code);
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("locale"),
  );
  expect(stored).toBe(code);
}

test.describe("locale switching", () => {
  test("switches all three locales and persists the choice", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForSwitcherHydration(page);

    for (const code of ["en", "zh-hans", "zh-hant"] as const) {
      await openMenu(page);
      const item = page.getByRole("menuitemradio", {
        name: LOCALE_NAMES[code],
      });
      await expect(item).toBeVisible();
      await item.click();

      await expect(page.locator(MENU)).toHaveCount(0);
      await expectLocale(page, code);
      // The checked radio reflects the selection on the next open.
      await openMenu(page);
      await expect(
        page.getByRole("menuitemradio", { name: LOCALE_NAMES[code] }),
      ).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Escape");
    }

    // Chrome follows the store, not just the document attributes.
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator(TRIGGER)).toHaveAccessibleName(/Language/);
    await expectLocale(page, "en");
  });

  test("the menu Positioner sits on the brand popover layer", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForSwitcherHydration(page);
    await openMenu(page);

    const layers = await page.locator(MENU).evaluate((menu) => {
      const positioner = menu.parentElement;
      const header = document.querySelector("[data-site-header]");
      return {
        menu: positioner ? getComputedStyle(positioner).zIndex : null,
        header: header ? getComputedStyle(header).zIndex : null,
      };
    });
    // --z-popover (250) must beat the sticky header's --z-sticky (200).
    expect(layers.menu).toBe("250");
    expect(layers.header).toBe("200");
  });

  test("a non-default stored locale hydrates without a mismatch", async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" ||
        /hydrat/i.test(message.text()) ||
        /did not match/i.test(message.text())
      ) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) =>
      problems.push(`pageerror: ${error.message}`),
    );

    await page.addInitScript(() => {
      window.localStorage.setItem("locale", "en");
    });
    await page.goto("/");
    await waitForSwitcherHydration(page);

    await expectLocale(page, "en");
    // The static all-locale trigger label is CSS-toggled to English.
    await expect(page.locator(`${LABEL} [data-l="en"]`)).toBeVisible();
    await expect(page.locator(`${LABEL} [data-l="zh-hant"]`)).toBeHidden();

    expect(problems).toEqual([]);
  });

  test("clicking the current locale does not write storage again", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForSwitcherHydration(page);
    await expectLocale(page, "zh-hant");

    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      const state = { writes: 0 };
      (window as unknown as { __localeWrites: number }).__localeWrites = 0;
      Storage.prototype.setItem = function patchedSetItem(key, value) {
        if (key === "locale") state.writes += 1;
        (window as unknown as { __localeWrites: number }).__localeWrites =
          state.writes;
        return original.call(this, key, value);
      };
    });

    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
    await expect(page.locator(MENU)).toHaveCount(0);

    const afterSame = await page.evaluate(
      () => (window as unknown as { __localeWrites: number }).__localeWrites,
    );
    expect(afterSame).toBe(0);
    await expectLocale(page, "zh-hant");

    // Sanity: a real change does write, so the probe is live.
    await openMenu(page);
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expectLocale(page, "en");
    const afterChange = await page.evaluate(
      () => (window as unknown as { __localeWrites: number }).__localeWrites,
    );
    expect(afterChange).toBe(1);
  });
});

test.describe("keyboard and typeahead", () => {
  test("arrows move the highlight, Enter chooses, Escape closes and returns focus", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForSwitcherHydration(page);

    const trigger = page.locator(TRIGGER);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(MENU)).toBeVisible();

    // Move the highlight twice; the two stops must differ.
    await page.keyboard.press("ArrowDown");
    const first = await page
      .locator('[role="menuitemradio"][data-highlighted]')
      .innerText();
    await page.keyboard.press("ArrowDown");
    const second = await page
      .locator('[role="menuitemradio"][data-highlighted]')
      .innerText();
    expect(second).not.toBe(first);

    await page.keyboard.press("Enter");
    await expect(page.locator(MENU)).toHaveCount(0);

    const selected = (Object.keys(LOCALE_NAMES) as LocaleCode[]).find(
      (code) => LOCALE_NAMES[code] === second.trim(),
    );
    expect(selected).toBeDefined();
    if (selected) await expectLocale(page, selected);

    // Reopen, then Escape restores focus to the trigger without selecting.
    await trigger.click();
    await expect(page.locator(MENU)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(MENU)).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // Typeahead: "e" jumps the highlight to English.
    await trigger.click();
    await expect(page.locator(MENU)).toBeVisible();
    await page.keyboard.type("e");
    await expect(
      page.locator('[role="menuitemradio"][data-highlighted]'),
    ).toHaveText("English");
    await page.keyboard.press("Escape");
    await expect(page.locator(MENU)).toHaveCount(0);
  });
});

test.describe("compact trigger", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("is a 44px icon-only control with an accessible name", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForSwitcherHydration(page);

    const trigger = page.locator(TRIGGER);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAccessibleName(/語言/);
    await expectTouchTarget(page, TRIGGER, "language trigger @ 390px");

    // The label is visually clipped to a 1x1 sr-only box; only the globe shows
    // while the accessible name keeps "語言 · 繁體中文".
    const labelBox = await page.locator(LABEL).boundingBox();
    expect(labelBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(2);
    expect(labelBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(2);
    await expect(trigger.locator("svg").first()).toBeVisible();
  });
});

test.describe("screenshots", () => {
  test("captures the compact and desktop switcher", async ({
    page,
  }, testInfo) => {
    const suffix = testInfo.project.name;
    const dir = ".omo/evidence/architecture-artwork-refactor";

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForSwitcherHydration(page);
    await page.screenshot({
      path: `${dir}/task-19-language-390-${suffix}.png`,
      fullPage: false,
    });
    await openMenu(page);
    await page.screenshot({
      path: `${dir}/task-19-language-390-menu-${suffix}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await waitForSwitcherHydration(page);
    await page.screenshot({
      path: `${dir}/task-19-language-1440-${suffix}.png`,
      fullPage: false,
    });
    await openMenu(page);
    await page.screenshot({
      path: `${dir}/task-19-language-1440-menu-${suffix}.png`,
      fullPage: false,
    });
  });
});
