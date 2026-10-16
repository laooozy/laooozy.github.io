// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_INDEXABLE } from './src/lib/seo.ts';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://laooozy.github.io',
  // The sitemap is only useful for an indexable site; skip it while hidden so
  // it cannot contradict the noindex meta tags. Re-enables automatically with
  // SITE_INDEXABLE in src/lib/seo.ts.
  integrations: [...(SITE_INDEXABLE ? [sitemap()] : []), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});