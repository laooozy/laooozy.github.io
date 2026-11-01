import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/overflow";
import { expectTouchTarget } from "./helpers/target-size";

/**
 * The end-to-end user journey against the shipped artifact.
 *
 * The migration tasks own the detailed contracts (`header.spec.ts`,
 * `language.spec.ts`, `search-command.spec.ts`, `blog-listing.spec.ts`,
 * `post.spec.ts`, `music-library.spec.ts`, `photography.spec.ts`,
 * `responsive-audit.spec.ts`). This spec ties the journey together and fills the
 * remaining gaps:
 *
 *  - header navigation actually reaches every route and marks it current;
 *  - the locale switch survives a subsequent navigation;
 *  - the canonical music fixture (`scripts/music/fixtures/playlist.json`) has
 *    exactly four songs and drives search, organisation filtering and retry;
 *  - the Photography wall is built from the offline oEmbed fixture and its
 *    consent success/failure is driven by a local script stub, never Meta;
 *  - the whole page set stays readable with JavaScript disabled;
 *  - reduced motion disables the entrance reveal instead of blanking content.
 *
 * Pagination is deliberately NOT exercised here: the real content has fewer
 * than PAGE_SIZE posts, so the index emits no paginator. The multi-page markup
 * and its links are pinned by the component test `blog-listing.test.tsx`; the
 * E2E assertion is the single-page index having no paginator
 * (`blog-listing.spec.ts`).
 */

const HEADER = "[data-site-header]";
const DESKTOP_NAV = `${HEADER} [data-site-nav]`;
const MOBILE_MENU = `${HEADER} details.site-menu`;
const POST_PATH = "/blog/2026-10-20_bootstrap-blog/";

/**
 * The canonical four-song wire payload. Never the live `music_asset` branch.
 * The literal 4 is the contract: if the fixture grows, this test must be
 * deliberately updated, not silently follow the new length.
 */
const MUSIC_FIXTURE = readFileSync(
  join(process.cwd(), "scripts/music/fixtures/playlist.json"),
  "utf8",
);
const MUSIC_SONG_COUNT = 4;

async function waitForIsland(page: Page, component: string) {
  await page.waitForFunction((name) => {
    const island = document.querySelector(
      `astro-island[component-url*="${name}"]`,
    );
    return island !== null && !island.hasAttribute("ssr");
  }, component);
}

async function waitForHydration(page: Page) {
  await waitForIsland(page, "SiteHeader");
}

/** A 1x1 transparent PNG so fixture thumbnails never hit the network. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

/** Serve the canonical fixture (optionally failing the first request). */
async function stubMusic(page: Page, failFirst = false) {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG }),
  );

  let requests = 0;
  await page.route("**/music.json.gz", (route) => {
    requests += 1;
    if (failFirst && requests === 1) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: "{}",
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: MUSIC_FIXTURE,
    });
  });
}

async function openMusic(page: Page) {
  await page.goto("/music/");
  await waitForIsland(page, "MusicLibrary");
  await expect(page.locator("[data-music-row]").first()).toBeVisible();
}

async function openFilters(page: Page) {
  if ((await page.locator("[data-music-artist]:visible").count()) === 0) {
    await page.locator("[data-music-filter-trigger]").click();
  }
  await expect(page.locator("[data-music-artist]:visible")).toBeVisible();
}

test.describe("header navigation journey", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("reaches every route, marks the current page, and the brand returns home", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.locator(`${DESKTOP_NAV} a[href="/blog/"]`).click();
    await page.waitForURL("**/blog/");
    await waitForIsland(page, "BlogList");
    await expect(
      page.locator(`${HEADER} [aria-current="page"]`).first(),
    ).toHaveAttribute("href", "/blog/");
    await expect(page.locator("[data-blog-listing] h1")).toHaveText("最新文章");

    await page.locator(`${DESKTOP_NAV} a[href="/links/"]`).click();
    await page.waitForURL("**/links/");
    await expect(
      page.locator(`${HEADER} [aria-current="page"]`).first(),
    ).toHaveAttribute("href", "/links/");
    await expect(page.locator('main h1 [data-l="zh-hant"]')).toHaveText(
      "實用連結",
    );

    // The brand is the one link back to the home document.
    await page.locator(`${HEADER} a[href="/"]`).first().click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("#hero, main h1").first()).toBeVisible();

    // The two section links resolve to the home anchors.
    await page.goto("/blog/");
    await waitForHydration(page);
    await page.locator(`${DESKTOP_NAV} a[href="/#about"]`).click();
    await page.waitForURL("**/#about");
    await expect(page.locator("#about")).toBeVisible();

    await page.locator(`${DESKTOP_NAV} a[href="/#contact"]`).click();
    await page.waitForURL("**/#contact");
    await expect(page.locator("#contact")).toBeVisible();

    // Photography stays off the nav; it is reached from the home About grid.
    await expect(
      page.locator(`${HEADER} a[href="/photographer/"]`),
    ).toHaveCount(0);
  });

  test("the mobile disclosure reaches the listing and active state", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForHydration(page);

    await page.locator(`${MOBILE_MENU} summary`).click();
    await page.locator(`${MOBILE_MENU} a[href="/blog/"]`).click();
    await page.waitForURL("**/blog/");

    await expect(
      page.locator(`${MOBILE_MENU} a[aria-current="page"]`),
    ).toHaveAttribute("href", "/blog/");
  });
});

test.describe("locale switch survives navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("switches to English, then the listing chrome is English too", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForIsland(page, "LanguageSwitcher");

    await page.locator("[data-language-trigger]").click();
    await waitForIsland(page, "LanguageSwitcher");
    await page.getByRole("menuitemradio", { name: "English" }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-locale", "en");
    await expect(page.locator(`${DESKTOP_NAV} a[href="/blog/"]`)).toHaveText(
      "Blog",
    );

    await page.locator(`${DESKTOP_NAV} a[href="/blog/"]`).click();
    await page.waitForURL("**/blog/");
    await waitForIsland(page, "BlogList");

    await expect(page.locator("[data-blog-listing] h1")).toHaveText(
      "Latest posts",
    );
    await expect(page.locator("html")).toHaveAttribute("data-locale", "en");
  });
});

test.describe("music journey (canonical 4-song fixture)", () => {
  test("renders exactly four songs, searches and filters without a live endpoint", async ({
    page,
  }) => {
    await stubMusic(page);
    await openMusic(page);

    const rows = page.locator("[data-music-row]");
    await expect(rows).toHaveCount(MUSIC_SONG_COUNT);
    await expect(page.locator("[data-music-count]")).toContainText(
      `共 ${MUSIC_SONG_COUNT} 首`,
    );
    await expect(rows.first()).toContainText("花譜 - 春を発つ");
    await expect(rows.last()).toContainText("Another Fixture Track");

    await page.locator("#music-search").fill("理芽");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("ディアマイフレンド");
    await expect(page.locator("[data-music-count]")).toContainText("共 1 首");

    await page.locator("#music-search").fill("");
    await openFilters(page);
    await page.locator("[data-music-org]:visible").selectOption("kamitsubaki");
    await expect(rows).toHaveCount(2);
    await expect(page.locator("[data-music-count]")).toContainText("共 2 首");

    await expectTouchTarget(page, "#music-search", "music search");
    await expectNoHorizontalOverflow(page, "music journey");
  });

  test("a failed fixture fetch shows the error and retry recovers to four rows", async ({
    page,
  }) => {
    await stubMusic(page, true);
    await page.goto("/music/");
    await waitForIsland(page, "MusicLibrary");

    await expect(
      page.getByText("歌單暫時無法載入，請再試一次。"),
    ).toBeVisible();
    await expect(page.locator("[data-music-row]")).toHaveCount(0);

    await page.getByRole("button", { name: "重試" }).click();
    await expect(page.locator("[data-music-row]")).toHaveCount(
      MUSIC_SONG_COUNT,
    );
    await expect(page.getByText("歌單暫時無法載入，請再試一次。")).toHaveCount(
      0,
    );
  });
});

test.describe("Instagram consent journey", () => {
  const GATE_BUTTON = "載入 Instagram 貼文";
  const THIRD_PARTY = /graph\.facebook\.com|instagram\.com|cdninstagram\.com/i;

  /** Local stand-in for Meta's embed.js; no iframe, no network. */
  async function stubEmbedScript(page: Page) {
    await page.route("**/embed.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.instgrm={Embeds:{process(){}}};",
      }),
    );
  }

  test("uses the offline oEmbed fixture, then loads from the local script stub", async ({
    page,
  }) => {
    const thirdParty: string[] = [];
    page.on("request", (request) => {
      if (THIRD_PARTY.test(request.url())) thirdParty.push(request.url());
    });

    await stubEmbedScript(page);
    await page.goto("/photographer/");
    await waitForIsland(page, "InstagramGate");

    // The build seam rendered deterministic blockquotes with no Meta request.
    const embeds = page.locator("[data-ig-embeds]");
    await expect(embeds).toHaveAttribute("hidden", "");
    await expect(embeds.locator("blockquote.instagram-media")).toHaveCount(2);
    await expect(
      embeds.locator("blockquote.instagram-media[data-instgrm-permalink]"),
    ).toHaveCount(2);
    expect(
      thirdParty.filter((url) => url.includes("graph.facebook.com")),
      "the build must not call Meta in the E2E artifact",
    ).toEqual([]);
    await expect(page.locator("[data-ig-gate]")).toBeVisible();

    await page.getByRole("button", { name: GATE_BUTTON }).click();
    await expect(embeds).not.toHaveAttribute("hidden");
    await expect(page.locator("[data-ig-gate]")).toHaveAttribute("hidden", "");
    await expect(page.locator("[data-ig-gate-error]")).toHaveCount(0);
  });

  test("a blocked embed script falls back to the local index and alert", async ({
    page,
  }) => {
    await page.route("**/embed.js", (route) => route.abort("blockedbyclient"));
    await page.goto("/photographer/");
    await waitForIsland(page, "InstagramGate");

    await page.getByRole("button", { name: GATE_BUTTON }).click();

    const alert = page.locator("[data-ig-gate-error]");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("無法載入 Instagram 貼文");
    await expect(page.locator("[data-ig-embeds]")).toHaveAttribute(
      "hidden",
      "",
    );
    await expect(page.locator("[data-ig-gate]")).toBeVisible();
    await expect(page.getByRole("button", { name: "再試一次" })).toBeEnabled();
  });
});

test.describe("JavaScript disabled journey", () => {
  test.use({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });

  test("every route keeps its server-rendered content and chrome", async ({
    page,
  }) => {
    const checks: Array<[string, string]> = [
      ["/", "#hero, main h1"],
      ["/blog/", "[data-blog-listing]"],
      ["/photographer/", "[data-ig-gate]"],
      ["/music/", "main h1"],
      ["/links/", "[data-link-card]"],
      [POST_PATH, "article .prose-brand"],
    ];

    for (const [path, selector] of checks) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} status`).toBe(200);
      await expect(
        page.locator(selector).first(),
        `${path} content`,
      ).toBeVisible();
      await expect(page.locator(DESKTOP_NAV)).toBeVisible();
      await expect(page.locator("[data-site-footer]")).toBeVisible();
      await expectNoHorizontalOverflow(page, `${path} with JS disabled`);
    }

    // The music page's no-JS escape hatch is real text, not a spinner.
    await page.goto("/music/");
    await expect(
      page.getByText(/這個歌單需要 JavaScript 才能載入/),
    ).toBeVisible();
  });
});

test.describe("reduced motion journey", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("the entrance reveal is inert and the content is visible from the start", async ({
    page,
  }) => {
    await page.goto("/");

    const reveal = page.locator(".home .reveal");
    const count = await reveal.count();
    expect(count).toBeGreaterThan(0);

    const states = await reveal.evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          animationName: style.animationName,
          opacity: style.opacity,
          transform: style.transform,
        };
      }),
    );

    for (const state of states) {
      expect(state.animationName).toBe("none");
      expect(state.opacity).toBe("1");
      expect(state.transform).toBe("none");
    }

    // No atmosphere canvas and no second frame loop under reduced motion.
    await expect(page.locator("#atmosphere-canvas")).toHaveCount(0);
    await expect(page.locator("#about")).toBeVisible();
  });
});
