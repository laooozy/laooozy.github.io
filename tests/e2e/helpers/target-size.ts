import type { Page } from "@playwright/test";

/**
 * The WCAG 2.5.5 target size from AGENTS.md: every interactive control must
 * offer at least a 44 by 44 CSS px hit area under `(pointer: coarse)`.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * The smallest accepted form-control font size on mobile. Below 16px iOS
 * Safari zooms the viewport on focus.
 */
export const MIN_INPUT_FONT_SIZE = 16;

export interface TargetSize {
  selector: string;
  width: number;
  height: number;
  fontSize: number;
  minWidth: number;
  minHeight: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Measures one rendered element in the live page. Everything comes from the
 * browser: `getBoundingClientRect` for the hit area and `getComputedStyle` for
 * the resolved font size and min-size floors. No screenshots and no class-name
 * assumptions, so a CSS regression is reported as pixels.
 */
export async function measureTarget(
  page: Page,
  selector: string,
): Promise<TargetSize> {
  const measurement = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`target-size probe: no element matches ${sel}`);
    }

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const roundLocal = (value: number) => Math.round(value * 100) / 100;

    return {
      selector: sel,
      width: roundLocal(rect.width),
      height: roundLocal(rect.height),
      fontSize: roundLocal(Number.parseFloat(style.fontSize)),
      minWidth: roundLocal(Number.parseFloat(style.minWidth) || 0),
      minHeight: roundLocal(Number.parseFloat(style.minHeight) || 0),
    };
  }, selector);

  return measurement;
}

/**
 * Asserts the 44x44 coarse-pointer contract for one control. The failure
 * message names the selector and the measured box so a too-small control is
 * actionable, and the helper itself is reusable by later chrome tasks.
 */
export async function expectTouchTarget(
  page: Page,
  selector: string,
  label = selector,
): Promise<TargetSize> {
  const size = await measureTarget(page, selector);

  if (size.width < MIN_TOUCH_TARGET || size.height < MIN_TOUCH_TARGET) {
    throw new Error(
      `${label}: target is ${round(size.width)}x${round(size.height)}px, expected at least ${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET} CSS px under a coarse pointer (min-width=${round(size.minWidth)}px, min-height=${round(size.minHeight)}px)`,
    );
  }

  return size;
}

/** Asserts the 16px mobile input contract on the resolved font size. */
export async function expectMinimumFontSize(
  page: Page,
  selector: string,
  minimum = MIN_INPUT_FONT_SIZE,
  label = selector,
): Promise<TargetSize> {
  const size = await measureTarget(page, selector);

  if (size.fontSize < minimum) {
    throw new Error(
      `${label}: computed font-size is ${round(size.fontSize)}px, expected at least ${minimum}px so mobile Safari does not zoom on focus`,
    );
  }

  return size;
}
