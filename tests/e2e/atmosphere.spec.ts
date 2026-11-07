import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

/**
 * Focused atmosphere contract for Task 22.
 *
 * The deep-space canvas is one client module that draws on the SINGLE
 * `DomPort.startLoop` loop. These tests pin the observable contract: exactly
 * one canvas, presentation from `src/styles/atmosphere.css` (fixed,
 * `pointer-events:none`, `--z-ambient`), DPR capped at 2, no animation under
 * `prefers-reduced-motion: reduce`, and a loop that pauses while the tab is
 * hidden and resumes when it returns.
 */

const CANVAS = "#atmosphere-canvas";
const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/screenshots",
);

interface RafFrame {
  /** Animation-frame timestamp shared by every callback in one tick. */
  time: number;
  /** Id of the rAF chain that scheduled this callback. */
  chain: number;
}

interface RafProbe {
  frames: RafFrame[];
}

declare global {
  interface Window {
    __rafFrames?: RafFrame[];
  }
}

/**
 * Record every `requestAnimationFrame` callback before any app code runs and
 * tag it with the chain that scheduled it. A callback scheduled while another
 * callback is running inherits that callback's chain, so a loop that schedules
 * its own continuation stays one chain across frames. An independent loop
 * starts a new chain because it is scheduled outside a callback.
 */
async function probeAnimationFrames(page: Page) {
  await page.addInitScript(() => {
    window.__rafFrames = [];
    let nextChain = 0;
    let currentChain: number | null = null;
    const native = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const chain = currentChain ?? nextChain;
      if (currentChain === null) nextChain += 1;
      return native((time) => {
        window.__rafFrames?.push({ time, chain });
        const previous = currentChain;
        currentChain = chain;
        try {
          callback(time);
        } finally {
          currentChain = previous;
        }
      });
    };
  });
}

async function readRafProbe(page: Page): Promise<RafProbe> {
  return page.evaluate(() => ({ frames: window.__rafFrames ?? [] }));
}

/**
 * Count the rAF chains that run in more than one animation frame. The shared
 * animation loop is one recurring chain. A one-off frame (scroll coalescing,
 * focus restore, hydration) appears in a single frame and is not a loop, and a
 * loop's startup can legitimately have its initial and continuation callbacks
 * share one tick. A second loop would be a second recurring chain.
 */
function recurringChainCount(frames: RafFrame[]): number {
  const framesByChain = new Map<number, Set<number>>();
  for (const { time, chain } of frames) {
    let times = framesByChain.get(chain);
    if (times === undefined) {
      times = new Set<number>();
      framesByChain.set(chain, times);
    }
    times.add(time);
  }
  return [...framesByChain.values()].filter((times) => times.size > 1).length;
}

/** Flip `document.hidden` and fire the event the DOM port listens for. */
async function setDocumentHidden(page: Page, hidden: boolean) {
  await page.evaluate((nextHidden) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => nextHidden,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (nextHidden ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("one canvas, stylesheet presentation, capped DPR and console clean", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await probeAnimationFrames(page);
  await page.goto("/");
  await expect(page.locator(CANVAS)).toHaveCount(1);

  const canvas = page.locator(CANVAS);
  const metrics = await canvas.evaluate((element: HTMLCanvasElement) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      position: style.position,
      pointerEvents: style.pointerEvents,
      zIndex: Number(style.zIndex),
      cssWidth: rect.width,
      cssHeight: rect.height,
      bufferWidth: element.width,
      bufferHeight: element.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  expect(metrics.position).toBe("fixed");
  expect(metrics.pointerEvents).toBe("none");
  expect(metrics.zIndex).toBe(-1);
  expect(metrics.cssWidth).toBeGreaterThan(0);
  expect(metrics.cssHeight).toBeGreaterThan(0);
  expect(metrics.bufferWidth).toBeLessThanOrEqual(
    Math.ceil(metrics.cssWidth * 2) + 1,
  );
  expect(metrics.bufferHeight).toBeLessThanOrEqual(
    Math.ceil(metrics.cssHeight * 2) + 1,
  );

  // Wait for the loop to run across several distinct frames, not a fixed
  // sleep: the sample is then long enough to expose a second recurring chain.
  // Poll from the test process, never from the page: Playwright's default
  // in-page rAF polling would itself register as a second chain in the probe.
  await expect
    .poll(
      async () => {
        const { frames } = await readRafProbe(page);
        return new Set(frames.map((frame) => frame.time)).size;
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThanOrEqual(6);
  const probe = await readRafProbe(page);
  expect(recurringChainCount(probe.frames)).toBe(1);

  expect(errors).toEqual([]);
});

test("tab hidden pauses the single loop and visibility resumes it", async ({
  page,
}) => {
  await probeAnimationFrames(page);
  await page.goto("/");
  await expect(page.locator(CANVAS)).toHaveCount(1);
  await page.waitForTimeout(250);

  const before = (await readRafProbe(page)).frames.length;
  expect(before).toBeGreaterThan(0);

  await setDocumentHidden(page, true);
  await page.waitForTimeout(350);
  const whileHidden = (await readRafProbe(page)).frames.length;
  // At most the already-scheduled frame runs after the pause; no new chain.
  expect(whileHidden - before).toBeLessThanOrEqual(1);

  await setDocumentHidden(page, false);
  await page.waitForTimeout(350);
  const afterResume = (await readRafProbe(page)).frames.length;
  expect(afterResume).toBeGreaterThan(whileHidden + 2);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("creates no canvas and starts no animation loop", async ({ page }) => {
    await probeAnimationFrames(page);
    await page.goto("/");

    await expect(page.locator(CANVAS)).toHaveCount(0);
    await page.waitForTimeout(300);

    const probe = await readRafProbe(page);
    expect(probe.frames).toEqual([]);
  });
});

test.describe("DPR cap at a 3x phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });

  test("rasterises the canvas at 2x, not the device 3x", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(CANVAS)).toHaveCount(1);

    const metrics = await page
      .locator(CANVAS)
      .evaluate((element: HTMLCanvasElement) => ({
        devicePixelRatio: window.devicePixelRatio,
        bufferWidth: element.width,
        cssWidth: element.getBoundingClientRect().width,
      }));

    expect(metrics.devicePixelRatio).toBe(3);
    expect(metrics.bufferWidth).toBeLessThanOrEqual(
      Math.ceil(metrics.cssWidth * 2) + 1,
    );
  });
});

for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  test(`screenshot of the atmosphere at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(CANVAS)).toHaveCount(1);
    await page.waitForTimeout(400);

    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(
        SCREENSHOT_DIR,
        `task-22-atmosphere-${width}-${testInfo.project.name}.png`,
      ),
      fullPage: false,
    });
  });
}
