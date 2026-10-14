// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://laooozy.github.io',
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
