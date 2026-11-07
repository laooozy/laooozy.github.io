import { expect, type Page, test } from "@playwright/test";

import {
  NOW_TICKER_PAUSED_CLASS,
  NOW_TICKER_RUNNING_TRACK_CLASS,
  NOW_TICKER_TOGGLE_CLASS,
} from "../../src/components/site/now-ticker-classes";

/**
 * Computed-style contract for the "now" ticker marquee.
 *
 * The pause must live on the track only: hovering the line and focusing an item
 * with the keyboard pause it, while the explicit pause state is the toggle's
 * job. The toggle is a sibling of the track, so its own hover or focus must
 * never pause the marquee. These assertions run in a real browser against the
 * built stylesheet, using the same class constants the component renders.
 */

const TRACK = "#ticker-track";
const ITEM = "#ticker-item";
const TOGGLE = "#ticker-toggle";

/** Move the pointer off the fixture so `:hover` cannot pause the track. */
async function movePointerAway(page: Page) {
  const viewport = page.viewportSize();
  await page.mouse.move(
    (viewport?.width ?? 800) - 1,
    (viewport?.height ?? 600) - 1,
  );
}

/** Load the built document, then mount a fixture with the real class strings. */
async function mountTickerFixture(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ track, toggle }) => {
      document.body.innerHTML = `
        <div class="now-ticker">
          <div class="now-ticker__viewport">
            <div id="ticker-track" class="${track}">
              <div class="now-ticker__group">
                <a id="ticker-item" href="#now">Now item</a>
              </div>
            </div>
          </div>
          <button id="ticker-toggle" type="button" class="${toggle}">Pause</button>
        </div>
      `;
    },
    { track: NOW_TICKER_RUNNING_TRACK_CLASS, toggle: NOW_TICKER_TOGGLE_CLASS },
  );
  await movePointerAway(page);
}

async function playState(page: Page): Promise<string> {
  return page
    .locator(TRACK)
    .evaluate((element) => getComputedStyle(element).animationPlayState);
}

/** Hover without Playwright's stability wait; the marquee never stops moving. */
async function hoverCenter(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`no bounding box for ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

async function clearPointerAndFocus(page: Page) {
  await movePointerAway(page);
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
}

test.describe("now ticker pause", () => {
  test.use({ reducedMotion: "no-preference" });

  test("pauses on track hover, item focus, or the explicit state only", async ({
    page,
  }) => {
    await mountTickerFixture(page);

    // The real utility produced a running animation, not a no-op class.
    expect(await playState(page)).toBe("running");
    expect(
      await page
        .locator(TRACK)
        .evaluate((element) => getComputedStyle(element).animationName),
    ).not.toBe("none");

    await clearPointerAndFocus(page);

    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
      await hoverCenter(page, TRACK);
      await expect.poll(() => playState(page)).toBe("paused");

      await clearPointerAndFocus(page);
      await expect.poll(() => playState(page)).toBe("running");
    }

    // Keyboard focus inside the track pauses through `has-[:focus-visible]`.
    await page.keyboard.press("Tab");
    await expect(page.locator(ITEM)).toBeFocused();
    expect(
      await page.evaluate(
        () => document.activeElement?.matches(":focus-visible") ?? false,
      ),
    ).toBe(true);
    await expect.poll(() => playState(page)).toBe("paused");

    await clearPointerAndFocus(page);
    await expect.poll(() => playState(page)).toBe("running");

    // The explicit toggle state pauses without any hover or focus.
    await page
      .locator(TRACK)
      .evaluate(
        (element, className) => element.classList.add(className),
        NOW_TICKER_PAUSED_CLASS,
      );
    expect(await playState(page)).toBe("paused");
  });

  test("the toggle's own hover and focus never pause the marquee", async ({
    page,
  }) => {
    await mountTickerFixture(page);
    const toggle = page.locator(TOGGLE);

    await clearPointerAndFocus(page);
    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
      await toggle.hover();
      expect(await playState(page)).toBe("running");
    }

    await clearPointerAndFocus(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    expect(
      await page.evaluate(
        () => document.activeElement?.matches(":focus-visible") ?? false,
      ),
    ).toBe(true);
    expect(await playState(page)).toBe("running");
  });
});
