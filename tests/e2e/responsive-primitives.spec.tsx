import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";

import ChipRow from "../../src/components/shared/ChipRow";
import { INTERACTIVE_TOUCH_CLASSES } from "../../src/components/shared/layout/classes";
import Text from "../../src/components/shared/typography/Text";
import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import {
  expectMinimumFontSize,
  expectTouchTarget,
  measureTarget,
} from "./helpers/target-size";

/**
 * The responsive target-size probe for the shared primitives.
 *
 * The components are rendered to static markup on the Node side and injected
 * into a real page, so the measurement uses the production stylesheet (the
 * `pointer-coarse:` variant, the generated shadcn sizes and the token-based
 * input font). Nothing here probes the Wave 3 chrome; Tasks 17-23 own that.
 */
const PROBE_HOST_ID = "primitive-target-probe";
const PROBE_SELECTOR = `#${PROBE_HOST_ID}`;

const PROBE_MARKUP = renderToStaticMarkup(
  <div id={PROBE_HOST_ID}>
    {/* A real Button relying on the shared coarse-pointer floor. */}
    <Button id="probe-button" className={INTERACTIVE_TOUCH_CLASSES}>
      OK
    </Button>
    {/* A real filter chip: the generated size="sm" Button plus the floor. */}
    <ChipRow
      variant="filter"
      items={[{ label: "OK", href: "/blog/2026/", active: true }]}
    />
    {/* The generated input carries text-base below md. */}
    <Input id="probe-input" aria-label="Probe input" />
    {/* Body copy must never fall under the 16px mobile floor. */}
    <Text as="span" id="probe-text">
      Probe copy
    </Text>
    {/*
      Deliberately bad fixture: a 24x24 control with no coarse-pointer floor.
      The spec proves the reusable helper rejects it.
    */}
    <button id="probe-bad" type="button" style={{ width: 24, height: 24 }}>
      Bad
    </button>
  </div>,
);

async function injectProbeMarkup(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(
    ({ html, hostId }) => {
      const host = document.createElement("div");
      host.id = `${hostId}-host`;
      host.style.cssText =
        "position:absolute;top:0;left:0;padding:1rem;z-index:-1;pointer-events:none";
      host.innerHTML = html;
      document.body.append(host);
    },
    { html: PROBE_MARKUP, hostId: PROBE_HOST_ID },
  );
  await page.evaluate(() => document.fonts?.ready);
}

test.describe("responsive primitive target sizes", () => {
  test.beforeEach(async ({ isMobile, page }) => {
    test.skip(
      !isMobile,
      "the 44px/16px contract is the coarse-pointer (mobile) surface",
    );
    await injectProbeMarkup(page);
  });

  test("Button and ChipRow controls meet the 44x44 coarse-pointer target", async ({
    page,
  }) => {
    const coarsePointer = await page.evaluate(
      () => window.matchMedia("(pointer: coarse)").matches,
    );
    expect(coarsePointer).toBe(true);

    const button = await expectTouchTarget(
      page,
      `${PROBE_SELECTOR} #probe-button`,
      "Button + INTERACTIVE_TOUCH_CLASSES",
    );
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);

    const chip = await expectTouchTarget(
      page,
      `${PROBE_SELECTOR} [data-slot="chip-row"] a`,
      "ChipRow filter link",
    );
    expect(chip.width).toBeGreaterThanOrEqual(44);
    expect(chip.height).toBeGreaterThanOrEqual(44);
  });

  test("Input and Text keep the 16px mobile floor", async ({ page }) => {
    const input = await expectMinimumFontSize(
      page,
      `${PROBE_SELECTOR} #probe-input`,
    );
    expect(input.fontSize).toBeGreaterThanOrEqual(16);

    const text = await measureTarget(page, `${PROBE_SELECTOR} #probe-text`);
    expect(text.fontSize).toBeGreaterThanOrEqual(16);
  });

  test("the target-size helper rejects a 24px control", async ({ page }) => {
    const bad = await measureTarget(page, `${PROBE_SELECTOR} #probe-bad`);
    expect(bad.width).toBe(24);
    expect(bad.height).toBe(24);

    let failure: string | null = null;
    try {
      await expectTouchTarget(
        page,
        `${PROBE_SELECTOR} #probe-bad`,
        "deliberately bad 24px fixture",
      );
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    // The intentional failure is the proof: the helper refuses a 24x24 box.
    expect(failure).not.toBeNull();
    expect(failure).toContain("24x24px");
    expect(failure).toContain("expected at least 44x44");
  });
});
