import { expect, type Page } from "@playwright/test";

/**
 * One element whose right edge extends past the viewport. `selector` is a
 * best-effort readable identifier (`tag#id.class`) for the failure message.
 */
export interface OverflowingElement {
  selector: string;
  tag: string;
  right: number;
  width: number;
}

export interface OverflowMeasurement {
  scrollWidth: number;
  clientWidth: number;
  overflowing: OverflowingElement[];
}

/**
 * Reads the document's horizontal extent and the page-level elements that
 * stick out past the viewport's right edge. Pure DOM measurement: no
 * screenshots, no assumptions about a specific framework or class naming.
 *
 * "Page-level" is the important part. A wide child inside an internal
 * horizontal scroller (`.prose-brand table`, a `<pre>`, a carousel) is that
 * container's overflow, not the page's: the container clips or scrolls it, so
 * the document never widens. Such a child is skipped. The boundary check only
 * looks below `body`/`html`; the root rules are what a real page overflow has
 * to be measured against, not treated as an exemption.
 */
export async function measureHorizontalOverflow(
  page: Page,
): Promise<OverflowMeasurement> {
  // Weights and fallbacks can change line wrapping; measure only after the
  // loaded fonts settle so the result is deterministic across runs.
  await page.evaluate(() => document.fonts?.ready);

  return page.evaluate(() => {
    const root = document.documentElement;
    const limit = root.clientWidth;
    const overflowing: Array<{
      selector: string;
      tag: string;
      right: number;
      width: number;
    }> = [];

    /**
     * True when an ancestor between the element and the root establishes a
     * horizontal overflow boundary. `visible` (and `inherit`-resolved
     * `visible`) does not, so an element is never excused merely for being
     * nested.
     */
    const insideHorizontalBoundary = (element: HTMLElement): boolean => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (
          overflowX === "auto" ||
          overflowX === "scroll" ||
          overflowX === "clip" ||
          overflowX === "hidden"
        ) {
          return true;
        }
        ancestor = ancestor.parentElement;
      }
      return false;
    };

    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      if (!(element instanceof HTMLElement)) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= limit + 0.5) continue;
      if (insideHorizontalBoundary(element)) continue;

      const id = element.id ? `#${element.id}` : "";
      const classes = Array.from(element.classList)
        .slice(0, 2)
        .map((name) => `.${name}`)
        .join("");

      overflowing.push({
        selector: `${element.tagName.toLowerCase()}${id}${classes}`,
        tag: element.tagName.toLowerCase(),
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
      });

      if (overflowing.length >= 10) break;
    }

    return {
      scrollWidth: root.scrollWidth,
      clientWidth: limit,
      overflowing,
    };
  });
}

/**
 * Asserts the horizontal-overflow contract from AGENTS.md: at the current
 * viewport no page-level element may stick out past the viewport and
 * `documentElement.scrollWidth` must not exceed `clientWidth`.
 *
 * Both halves are required. Asserting only `scrollWidth` is defeated by
 * `overflow-x: clip` on `html`/`body`: the root clamps `scrollWidth` while the
 * child is still 600px wide. Asserting `overflowing` is what proves the gate
 * can fail. The failure message names the offending elements so a regression
 * is actionable.
 *
 * This helper only measures. Fixing an overflow is the caller's job; never
 * silence it with `overflow-x: hidden` on the root.
 */
export async function expectNoHorizontalOverflow(
  page: Page,
  context = "page",
): Promise<OverflowMeasurement> {
  const measurement = await measureHorizontalOverflow(page);

  const detail =
    measurement.overflowing.length > 0
      ? measurement.overflowing
          .map(
            ({ selector, right, width }) =>
              `  - ${selector}: width=${width}px right=${right}px`,
          )
          .join("\n")
      : "  (no element past the right edge; check root margins/padding)";

  expect(
    measurement.overflowing,
    `${context}: horizontal overflow: ${measurement.overflowing.length} page-level element(s) past the right edge\n${detail}`,
  ).toEqual([]);

  expect(
    measurement.scrollWidth,
    `${context}: horizontal overflow: scrollWidth=${measurement.scrollWidth} > clientWidth=${measurement.clientWidth}\n${detail}`,
  ).toBeLessThanOrEqual(measurement.clientWidth);

  return measurement;
}
