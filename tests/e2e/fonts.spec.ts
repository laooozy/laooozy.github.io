import { expect, test } from "@playwright/test";

/**
 * Proves the type voice is self-hosted: the brand faces actually load from this
 * origin, nothing is requested from Google Fonts, the Chinese fallback is part
 * of the computed stack, and swapping in the webfont does not shift layout.
 */

const GOOGLE_FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const CJK_FALLBACKS = ["PingFang TC", "Microsoft JhengHei", "Noto Sans TC"];

test("brand fonts are self-hosted, loaded, and shift-free", async ({
  page,
}) => {
  const requestedHosts: string[] = [];

  page.on("request", (request) => {
    try {
      requestedHosts.push(new URL(request.url()).host);
    } catch {
      // Non-URL requests (data:, blob:) cannot hit Google Fonts anyway.
    }
  });

  await page.addInitScript(() => {
    const state = window as unknown as {
      __cls?: number;
      __clsEntries?: number;
    };
    state.__cls = 0;
    state.__clsEntries = 0;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.__clsEntries = (state.__clsEntries ?? 0) + 1;
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) {
          state.__cls = (state.__cls ?? 0) + shift.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const fonts = await page.evaluate(() => {
    const loaded = Array.from(document.fonts)
      .filter((face) => face.status === "loaded")
      .map((face) => `${face.family.replaceAll('"', "")}:${face.weight}`);

    return {
      sora: document.fonts.check("16px Sora"),
      inter: document.fonts.check("16px Inter"),
      loaded,
      bodyFamily: getComputedStyle(document.body).fontFamily,
      headingFamily: getComputedStyle(
        document.querySelector("h1") ?? document.body,
      ).fontFamily,
    };
  });

  expect(fonts.sora).toBe(true);
  expect(fonts.inter).toBe(true);

  // `document.fonts.check` alone can pass for an unknown family, so also prove
  // that real Sora/Inter faces from this origin reached the `loaded` state.
  expect(fonts.loaded.some((face) => face.startsWith("Sora:"))).toBe(true);
  expect(fonts.loaded.some((face) => face.startsWith("Inter:"))).toBe(true);

  expect(fonts.bodyFamily).toContain("Inter");
  expect(fonts.headingFamily).toContain("Sora");
  for (const fallback of CJK_FALLBACKS) {
    expect(fonts.bodyFamily).toContain(fallback);
    expect(fonts.headingFamily).toContain(fallback);
  }

  const googleHosts = requestedHosts.filter((host) =>
    GOOGLE_FONT_HOSTS.includes(host),
  );
  expect(googleHosts).toEqual([]);

  // Give late layout-shift entries a frame to flush, then read the cumulative
  // score the observer accumulated since document start.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  const cls = await page.evaluate(
    () =>
      (window as unknown as { __cls?: number; __clsEntries?: number }).__cls ??
      0,
  );

  expect(cls).toBeLessThanOrEqual(0.02);
});
