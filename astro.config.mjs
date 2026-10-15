// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://laooozy.github.io',
  integrations: [sitemap()],
  i18n: {
    // Lowercase codes: Astro normalises locale codes to lowercase in URLs.
    // BCP-47 casing for the <html lang> attribute lives in src/i18n/ui.ts.
    locales: ['zh-hant', 'zh-hans', 'en'],
    defaultLocale: 'zh-hant',
    routing: {
      // Default locale (zh-hant) is served at the root, without a prefix.
      prefixDefaultLocale: false,
    },
  },
});
