import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 43 — the CJK typography contract.
 *
 * Two things are load-bearing and easy to regress:
 *  - the four short compounds (`網站`, `碎碎念`, `同好`, `看看`) never split
 *    across a line at phone width, while ordinary Chinese prose still breaks
 *    between Han characters (never `word-break: keep-all` on prose);
 *  - a long unbroken URL still wraps instead of widening the document.
 *
 * Measurements are real Range rects, not screenshots: a split compound is two
 * client rects with different `top` values.
 */

const EVIDENCE_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor",
);

const CASES = [
  { route: "/links/", compounds: ["網站", "看看"], shot: "task-43-links-390" },
  { route: "/blog/", compounds: ["碎碎念"], shot: "task-43-blog-390" },
  {
    route: "/blog/2026-10-20_bootstrap-blog/",
    compounds: ["同好", "看看"],
    shot: "task-43-post-390",
  },
  { route: "/", compounds: ["網站", "看看"], shot: null },
] as const;

interface Occurrence {
  compound: string;
  rects: number;
  lines: number;
  text: string;
}

/**
 * Every visible text-node occurrence of each compound, measured as one Range.
 * `checkVisibility` skips the closed mobile menu and the `display:none`
 * language-switcher strings.
 */
async function measureCompounds(
  page: Page,
  compounds: readonly string[],
): Promise<Occurrence[]> {
  await page.evaluate(() => document.fonts?.ready);

  return page.evaluate((wanted) => {
    const results: Occurrence[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();

    while (node) {
      const text = node.nodeValue ?? "";
      const parent = node.parentElement;
      const tag = parent?.tagName ?? "";

      if (
        parent &&
        tag !== "SCRIPT" &&
        tag !== "STYLE" &&
        tag !== "NOSCRIPT" &&
        parent.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        for (const compound of wanted) {
          let start = text.indexOf(compound);

          while (start !== -1) {
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, start + compound.length);
            const rects = Array.from(range.getClientRects()).filter(
              (rect) => rect.width > 0 && rect.height > 0,
            );
            const lineTops = new Set(rects.map((rect) => Math.round(rect.top)));

            results.push({
              compound,
              rects: rects.length,
              lines: lineTops.size,
              text: text.length > 48 ? `${text.slice(0, 48)}…` : text,
            });

            start = text.indexOf(compound, start + compound.length);
          }
        }
      }

      node = walker.nextNode();
    }

    return results;
  }, compounds);
}

test.describe("CJK line breaking at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { route, compounds, shot } of CASES) {
    test(`${route} keeps every known compound on one line`, async ({
      page,
    }) => {
      await page.goto(route);

      const occurrences = await measureCompounds(page, compounds);

      for (const compound of compounds) {
        const found = occurrences.filter(
          (occurrence) => occurrence.compound === compound,
        );
        expect(
          found.length,
          `expected at least one visible "${compound}" on ${route}`,
        ).toBeGreaterThan(0);

        for (const occurrence of found) {
          expect(
            occurrence.lines,
            `"${compound}" split across lines in: ${occurrence.text}`,
          ).toBe(1);
          expect(
            occurrence.rects,
            `"${compound}" rendered as ${occurrence.rects} fragments in: ${occurrence.text}`,
          ).toBe(1);
        }
      }

      if (shot) {
        mkdirSync(EVIDENCE_DIR, { recursive: true });
        await page.screenshot({
          path: join(EVIDENCE_DIR, `${shot}.png`),
          fullPage: true,
        });
      }
    });
  }

  test("prose keeps normal CJK wrapping and the strict line-break rule", async ({
    page,
  }) => {
    await page.goto("/blog/2026-10-20_bootstrap-blog/");

    const styles = await page.evaluate(() => {
      const prose = document.querySelector(".prose-brand");
      const bodyStyle = getComputedStyle(document.body);
      const proseStyle = prose ? getComputedStyle(prose) : null;

      return {
        bodyLineBreak: bodyStyle.lineBreak,
        proseLineBreak: proseStyle?.lineBreak,
        // `auto-phrase` is a progressive enhancement in Chromium; every other
        // engine must still report the explicit `normal` fallback.
        proseWordBreak: proseStyle?.wordBreak,
        proseOverflowWrap: proseStyle?.overflowWrap,
        proseTextWrap: proseStyle?.textWrap,
      };
    });

    expect(styles.bodyLineBreak).toBe("strict");
    expect(styles.proseLineBreak).toBe("strict");
    expect(["normal", "auto-phrase"]).toContain(styles.proseWordBreak);
    expect(styles.proseWordBreak).not.toBe("keep-all");
    expect(styles.proseOverflowWrap).toBe("break-word");
    expect(styles.proseTextWrap).toBe("pretty");
  });

  test("short labels use keep-all, prose never does", async ({ page }) => {
    await page.goto("/links/");

    const label = await page
      .locator('[data-link-card] [data-slot="card-description"]')
      .first()
      .evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          wordBreak: computed.wordBreak,
          overflowWrap: computed.overflowWrap,
        };
      });

    expect(label.wordBreak).toBe("keep-all");
    expect(label.overflowWrap).toBe("anywhere");
  });
});

for (const width of [320, 390] as const) {
  test.describe(`long unbroken runs at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test("an unbroken URL in prose still wraps inside the viewport", async ({
      page,
    }) => {
      await page.goto("/blog/2026-10-20_bootstrap-blog/");

      const probe = await page.evaluate(() => {
        const paragraph = document.querySelector(".prose-brand p");
        if (!paragraph) throw new Error("Missing prose paragraph");

        const url = document.createElement("span");
        url.setAttribute("data-overflow-probe", "url");
        url.textContent = ` https://example.com/${"a".repeat(180)}`;

        const cjk = document.createElement("span");
        cjk.setAttribute("data-overflow-probe", "cjk");
        cjk.textContent =
          "這是一段沒有標點符號的長中文測試文字用來確認換行不會撐破視窗寬度";

        paragraph.append(url, " ", cjk);

        const clientWidth = document.documentElement.clientWidth;
        const urlRect = url.getBoundingClientRect();
        const cjkRect = cjk.getBoundingClientRect();

        const measurement = {
          clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          urlRight: urlRect.right,
          cjkRight: cjkRect.right,
          urlWidth: urlRect.width,
          cjkWidth: cjkRect.width,
        };

        url.remove();
        cjk.remove();

        return measurement;
      });

      expect(probe.urlWidth).toBeLessThanOrEqual(probe.clientWidth);
      expect(probe.cjkWidth).toBeLessThanOrEqual(probe.clientWidth);
      expect(probe.urlRight).toBeLessThanOrEqual(probe.clientWidth + 0.5);
      expect(probe.cjkRight).toBeLessThanOrEqual(probe.clientWidth + 0.5);
      expect(probe.scrollWidth).toBeLessThanOrEqual(probe.clientWidth);

      await expectNoHorizontalOverflow(page, `post long run @ ${width}px`);
    });
  });
}
