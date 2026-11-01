import { mkdirSync } from "node:fs";

import { expect, test } from "@playwright/test";

/**
 * Proves the article body is the Tailwind Typography `prose` system skinned by
 * the single `.prose-brand` layer: the measure is 68ch, a wide table scrolls
 * inside the article without widening the page, and print repaints light with
 * visible text.
 */

const POST = "/blog/2026-10-20_bootstrap-blog/";
const EVIDENCE_DIR = ".omo/evidence/architecture-artwork-refactor/task-4-prose";

for (const width of [390, 1440]) {
  test(`article body uses the brand prose layer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(POST);

    const body = page.locator(".prose-brand");
    await expect(body).toHaveCount(1);
    await expect(body).toHaveClass(/\bprose\b/);
    await expect(body).toHaveClass(/\bprose-invert\b/);
    await expect(body).toHaveClass(/\bprose-brand\b/);

    const measurement = await body.evaluate((element) => {
      const style = getComputedStyle(element);
      const probe = document.createElement("span");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.width = "1ch";
      probe.style.padding = "0";
      probe.style.border = "0";
      probe.style.fontFamily = style.fontFamily;
      probe.style.fontSize = style.fontSize;
      probe.style.fontStyle = style.fontStyle;
      probe.style.fontWeight = style.fontWeight;
      probe.style.letterSpacing = style.letterSpacing;
      document.body.appendChild(probe);
      const ch = probe.getBoundingClientRect().width;
      probe.remove();
      return {
        computedMaxWidth: Number.parseFloat(style.maxWidth),
        oneCh: ch,
        expectedMaxWidth: ch * 68,
        fontSize: style.fontSize,
      };
    });

    console.log(`[prose ${width}px]`, measurement);

    expect(measurement.computedMaxWidth).toBeGreaterThan(0);
    expect(
      Math.abs(measurement.computedMaxWidth - measurement.expectedMaxWidth),
    ).toBeLessThanOrEqual(1);
  });
}

test("a wide table scrolls inside the article without widening the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(POST);

  const result = await page.evaluate(() => {
    const body = document.querySelector(".prose-brand");
    if (!body) throw new Error("Missing .prose-brand");

    const table = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (let column = 1; column <= 12; column += 1) {
      const cell = document.createElement("th");
      cell.textContent = `Column heading number ${column}`;
      headRow.appendChild(cell);
    }
    head.appendChild(headRow);
    table.appendChild(head);

    const bodyRow = document.createElement("tr");
    const tableBody = document.createElement("tbody");
    for (let column = 1; column <= 12; column += 1) {
      const cell = document.createElement("td");
      cell.textContent = `A deliberately long cell value ${column}`;
      cell.style.whiteSpace = "nowrap";
      bodyRow.appendChild(cell);
    }
    tableBody.appendChild(bodyRow);
    table.appendChild(tableBody);
    body.appendChild(table);

    const root = document.documentElement;
    const rect = table.getBoundingClientRect();
    return {
      pageScrollWidth: root.scrollWidth,
      pageClientWidth: root.clientWidth,
      tableScrollWidth: table.scrollWidth,
      tableClientWidth: table.clientWidth,
      tableRight: rect.right,
      overflowX: getComputedStyle(table).overflowX,
      display: getComputedStyle(table).display,
    };
  });

  console.log("[prose wide table]", result);

  expect(result.overflowX).toBe("auto");
  expect(result.tableScrollWidth).toBeGreaterThan(result.tableClientWidth);
  expect(result.pageScrollWidth).toBeLessThanOrEqual(result.pageClientWidth);
  expect(result.tableRight).toBeLessThanOrEqual(result.pageClientWidth + 0.5);
});

test("print render is light with visible article text", async ({ page }) => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(POST);
  await page.emulateMedia({ media: "print" });

  const colors = await page.evaluate(() => {
    const prose = document.querySelector(".prose-brand");
    if (!prose) throw new Error("Missing .prose-brand");
    const paragraph = prose.querySelector("p") ?? prose;
    const toRgb = (value: string) => {
      const match = value.match(/\d+(?:\.\d+)?/g) ?? [];
      return match.slice(0, 3).map(Number);
    };
    return {
      bodyBackground: toRgb(getComputedStyle(document.body).backgroundColor),
      bodyColor: toRgb(getComputedStyle(paragraph).color),
      proseMaxWidth: getComputedStyle(prose).maxWidth,
    };
  });

  const [backgroundRed, backgroundGreen, backgroundBlue] =
    colors.bodyBackground;
  const backgroundIsLight =
    (backgroundRed + backgroundGreen + backgroundBlue) / 3 > 230;
  const relativeLuminance = (rgb: number[]) => {
    const [red, green, blue] = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const light = relativeLuminance(colors.bodyBackground);
  const dark = relativeLuminance(colors.bodyColor);
  const contrastRatio =
    (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);

  console.log("[prose print]", { ...colors, contrastRatio });

  expect(backgroundIsLight).toBe(true);
  expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  expect(colors.proseMaxWidth).toBe("none");

  await page.screenshot({
    path: `${EVIDENCE_DIR}/print-article.png`,
    fullPage: false,
  });
});
