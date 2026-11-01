// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { SITE_INDEXABLE } from "./src/lib/seo.ts";

// https://astro.build/config
export default defineConfig({
  site: "https://laooozy.github.io",
  // The sitemap is only useful for an indexable site; skip it while hidden so
  // it cannot contradict the noindex meta tags. Re-enables automatically with
  // SITE_INDEXABLE in src/lib/seo.ts.
  integrations: [...(SITE_INDEXABLE ? [sitemap()] : []), react(), mdx()],

  /*
   * Warm every internal route on pointer hover. The site is fully static and
   * there is no client router, so prefetching only fetches the next document's
   * HTML; it never changes navigation semantics or adds a second animation
   * loop. `prefetchAll` covers the React-rendered chrome links without
   * sprinkling `data-astro-prefetch` on every anchor.
   */
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
