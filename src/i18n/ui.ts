/**
 * i18n UI-string layer.
 *
 * Locale codes are LOWERCASE (Astro normalises locale codes to lowercase in
 * generated URLs, so a mixed-case code would produce links that 404 against a
 * case-sensitive output folder). `langAttr` maps each code to its BCP-47 value
 * for the <html lang> attribute.
 *
 * These strings are authored per locale — they are NOT machine translations.
 * Untranslated PAGES fall back to zh-hant via Astro's `i18n.fallback`.
 */

export const languages = {
  "zh-hant": "繁體中文",
  "zh-hans": "简体中文",
  en: "English",
} as const;

export const defaultLang = "zh-hant";

/** BCP-47 language tag for the <html lang> attribute. */
export const langAttr = {
  "zh-hant": "zh-Hant",
  "zh-hans": "zh-Hans",
  en: "en",
} as const;

export const ui = {
  "zh-hant": {
    nav: { about: "關於", acg: "ACG", blog: "文章", contact: "聯絡" },
    home: {
      title: "laooozy",
      tagline: "攝影、遊戲，與我寫下的一些東西。",
    },
    about: { heading: "關於我" },
    acg: { heading: "ACG", cta: "看看我的 ACG 介紹" },
    blog: { heading: "最新文章", cta: "閱讀更多" },
    contact: { heading: "聯絡我" },
    button: { readMore: "閱讀更多", viewAll: "查看全部" },
    a11y: { skipToContent: "跳至主要內容", primaryNav: "主選單" },
    footer: { rights: "版權所有" },
  },
  "zh-hans": {
    nav: { about: "关于", acg: "ACG", blog: "文章", contact: "联系" },
    home: {
      title: "laooozy",
      tagline: "摄影、游戏，以及我写下的一些东西。",
    },
    about: { heading: "关于我" },
    acg: { heading: "ACG", cta: "看看我的 ACG 介绍" },
    blog: { heading: "最新文章", cta: "阅读更多" },
    contact: { heading: "联系我" },
    button: { readMore: "阅读更多", viewAll: "查看全部" },
    a11y: { skipToContent: "跳至主要内容", primaryNav: "主菜单" },
    footer: { rights: "版权所有" },
  },
  en: {
    nav: { about: "About", acg: "ACG", blog: "Blog", contact: "Contact" },
    home: {
      title: "laooozy",
      tagline: "Photography, games, and a few things I write down.",
    },
    about: { heading: "About me" },
    acg: { heading: "ACG", cta: "See my ACG intro" },
    blog: { heading: "Latest posts", cta: "Read more" },
    contact: { heading: "Get in touch" },
    button: { readMore: "Read more", viewAll: "View all" },
    a11y: { skipToContent: "Skip to main content", primaryNav: "Primary" },
    footer: { rights: "All rights reserved" },
  },
} as const;

export type Locale = keyof typeof ui;

/** Narrow an arbitrary locale string (e.g. `Astro.currentLocale`) to a known locale. */
export function resolveLocale(locale: string | undefined): Locale {
  return locale && locale in ui ? (locale as Locale) : defaultLang;
}

export function useTranslations(locale: keyof typeof ui) {
  return ui[locale] ?? ui[defaultLang];
}
