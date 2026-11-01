/**
 * Pagefind boundary regression guard.
 *
 * Every layout page indexes its `<main>` by default. The 404 route must be the
 * one exception: it passes `pagefindIgnore` so the build emits
 * `data-pagefind-ignore` (never `data-pagefind-body`) on `<main>`, which keeps
 * `/404.html` out of the search index while every content route stays in.
 */
import { getContainerRenderer } from "@astrojs/react/container-renderer";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { describe, expect, it } from "vitest";

import BaseLayout from "./BaseLayout.astro";

const renderers = await loadRenderers([getContainerRenderer()]);

async function renderLayout(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create({ renderers });
  return container.renderToString(BaseLayout, {
    props,
    slots: { default: "<p>page content</p>" },
  });
}

function mainTag(html: string): string {
  const match = /<main\b[^>]*>/.exec(html);
  if (!match) throw new Error("Rendered layout has no <main> element");
  return match[0];
}

describe("BaseLayout Pagefind boundary", () => {
  it("indexes <main> by default", async () => {
    const main = mainTag(await renderLayout({}));
    expect(main).toContain("data-pagefind-body");
    expect(main).not.toContain("data-pagefind-ignore");
  });

  it("opts <main> out when pagefindIgnore is set", async () => {
    const main = mainTag(await renderLayout({ pagefindIgnore: true }));
    expect(main).toContain("data-pagefind-ignore");
    expect(main).not.toContain("data-pagefind-body");
  });
});
