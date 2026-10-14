// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://laooozy.github.io',
  // The i18n fallback redirect route for `/en` and `/zh-hans` collides with the
  // explicit `src/pages/{en,zh-hans}/index.astro` routes (the explicit page has
  // higher priority and wins; the generated fallback stub is dropped). That is
  // the intended behaviour, so silence the otherwise-noisy prerender warning.
  prerenderConflictBehavior: 'ignore',
  integrations: [sitemap()],
  i18n: {
    // Lowercase codes: Astro normalises locale codes to lowercase in URLs.
    // BCP-47 casing for the <html lang> attribute lives in src/i18n/ui.ts.
    locales: ['zh-hant', 'zh-hans', 'en'],
    defaultLocale: 'zh-hant',
    routing: {
      // Default locale (zh-hant) is served at the root, without a prefix.
      prefixDefaultLocale: false,
      // Missing en/zh-hans pages redirect to the zh-hant content (not a 404).
      fallbackType: 'redirect',
    },
    fallback: {
      en: 'zh-hant',
      'zh-hans': 'zh-hant',
    },
  },
});
