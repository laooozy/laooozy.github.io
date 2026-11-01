import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";

/**
 * Task 29 — the rebuilt post header and prose.
 *
 * The contract:
 *  - the route owns exactly ONE `<article>` landmark and one `<h1>`, with the
 *    title and tag list marked `lang="zh-Hant"`;
 *  - the Markdown body stays Astro-rendered and carries the shared
 *    `prose prose-invert prose-brand` type system (React never owns it);
 *  - a wide table scrolls inside the article instead of widening the page, and
 *    the page does not overflow at 390 or 1440;
 *  - the back action is the header's one `Button`, tags are quiet `Badge` links.
 */

const POST = "/blog/2026-10-20_bootstrap-blog/";
const TITLE = "創世文";
const TAG = "隨筆";
const BACK_LABEL = "回到文章列表";

const SCREENSHOT_DIR = join(
  process.cwd(),
  ".omo/evidence/architecture-artwork-refactor/task-29-post",
);

async function open(page: Page) {
  await page.goto(POST);
  await page.evaluate(() => document.fonts?.ready);
}

test("the route owns one article, one h1 and a zh-Hant title", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  await expect(page.locator("article")).toHaveCount(1);

  const article = page.locator("article");
  const title = page.locator("article h1");

  await expect(title).toHaveCount(1);
  await expect(title).toHaveText(TITLE);
  await expect(title).toHaveAttribute("lang", "zh-Hant");
  await expect(article).toHaveAttribute("aria-labelledby", "post-title");
  await expect(title).toHaveAttribute("id", "post-title");

  // The header chrome stops at the header; the Markdown body is a sibling.
  const header = page.locator("article header");
  await expect(header).toHaveCount(1);
  await expect(header.locator("h1")).toHaveCount(1);

  // Exactly one h1 in the page content (the Astro dev toolbar owns its own
  // hidden h1s in dev, so scope the contract to `<main>`).
  await expect(page.locator("main h1")).toHaveCount(1);

  // The back action is the header's one button-styled link.
  const back = page.getByRole("link", { name: BACK_LABEL });
  await expect(back).toHaveCount(1);
  await expect(back).toHaveAttribute("href", "/blog/");
});

test("the Markdown body stays Astro-rendered with the shared prose layer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  const body = page.locator("article > .prose-brand");
  await expect(body).toHaveCount(1);
  await expect(body).toHaveAttribute("lang", "zh-Hant");
  await expect(body).toHaveClass(/\bprose\b/);
  await expect(body).toHaveClass(/\bprose-invert\b/);
  await expect(body).toHaveClass(/\bprose-brand\b/);

  // Authored Markdown is already in the document (not a React-owned body).
  await expect(body.locator("p").first()).toContainText(
    "創世文要寫甚麼比較好呢？",
  );
  await expect(body.locator("h2").first()).toHaveText("自我介紹");
});

test("tag links are zh-Hant quiet links to their archive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  const tags = page.locator("article nav[lang='zh-Hant']");
  await expect(tags).toHaveCount(1);

  const tag = tags.getByRole("link", { name: TAG });
  await expect(tag).toHaveCount(1);
  const href = await tag.getAttribute("href");
  expect(decodeURIComponent(href ?? "")).toBe(`/blog/tags/${TAG}/`);
});

test("a wide table scrolls inside the article without widening the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);

  const result = await page.evaluate(() => {
    const article = document.querySelector("article");
    const body = article?.querySelector(".prose-brand");
    if (!article || !body) throw new Error("Missing article or prose body");

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

    const tableBody = document.createElement("tbody");
    const bodyRow = document.createElement("tr");
    for (let column = 1; column <= 12; column += 1) {
      const cell = document.createElement("td");
      cell.textContent = `A deliberately long cell value ${column}`;
      cell.style.whiteSpace = "nowrap";
      bodyRow.appendChild(cell);
    }
    tableBody.appendChild(bodyRow);
    table.appendChild(tableBody);
    body.appendChild(table);

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = `const veryLongIdentifier = "${"x".repeat(300)}";`;
    pre.appendChild(code);
    body.appendChild(pre);

    const root = document.documentElement;
    const tableRect = table.getBoundingClientRect();
    const articleRect = article.getBoundingClientRect();

    return {
      pageScrollWidth: root.scrollWidth,
      pageClientWidth: root.clientWidth,
      tableScrollWidth: table.scrollWidth,
      tableClientWidth: table.clientWidth,
      tableRight: tableRect.right,
      articleRight: articleRect.right,
      tableInsideArticle: article.contains(table),
      tableOverflowX: getComputedStyle(table).overflowX,
      tableDisplay: getComputedStyle(table).display,
      preOverflowX: getComputedStyle(pre).overflowX,
      preInsideArticle: article.contains(pre),
    };
  });

  console.log("[post wide table]", result);

  expect(result.tableInsideArticle).toBe(true);
  expect(result.preInsideArticle).toBe(true);
  expect(result.tableDisplay).toBe("block");
  expect(result.tableOverflowX).toBe("auto");
  expect(result.preOverflowX).toBe("auto");
  expect(result.tableScrollWidth).toBeGreaterThan(result.tableClientWidth);
  expect(result.pageScrollWidth).toBeLessThanOrEqual(result.pageClientWidth);
  expect(result.tableRight).toBeLessThanOrEqual(result.articleRight + 0.5);
});

for (const width of [390, 1440]) {
  test(`post header and prose fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);

    await expectNoHorizontalOverflow(page, `post @ ${width}px`);

    // The Astro dev toolbar is not part of the shipped page; hide it (it may
    // re-mount itself) so the evidence capture shows the article alone.
    await page.addStyleTag({
      content: "astro-dev-toolbar { display: none !important; }",
    });

    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `post-${width}.png`),
      fullPage: true,
    });
  });
}
