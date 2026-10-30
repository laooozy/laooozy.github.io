/**
 * Pure i18n core.
 *
 * Locale codes are LOWERCASE (Astro normalises locale codes to lowercase in
 * generated URLs, so a mixed-case code would produce links that 404 against a
 * case-sensitive output folder). `langAttr` maps each code to its BCP-47 value
 * for the <html lang> attribute.
 *
 * These strings are the FIXED CHROME only: nav, footer, search, blog-listing,
 * 404, the links heading and the brand/meta strings. Page content lives in the
 * zh-hant MDX entries (`src/content/pages/*.mdx`) and is never translated, so
 * there are no content keys here.
 *
 * These strings are authored per locale. LLM-assisted translation is permitted:
 * a locale may be drafted by a model, but it must read naturally, keep the same
 * voice and never ship as raw machine output (see `PRODUCT.md`).
 *
 * This module is pure data + pure functions: no Astro, no DOM. `ui.ts` is kept
 * as a thin re-export barrel so existing importers keep resolving.
 */

import type { DotPaths, Locale, TranslationVars } from "./types";

export type { DotPaths, Locale, TranslationVars };

export const languages = {
  "zh-hant": "繁體中文",
  "zh-hans": "简体中文",
  en: "English",
} as const;

export const defaultLang = "zh-hant";

/** Public contact handles, identical in every locale. */
export const contactIdentity = {
  personalIg: "laooozy",
  acgIg: "acg.laooozy",
  email: "laooozy@outlook.com",
} as const;

/** BCP-47 language tag for the <html lang> attribute. */
export const langAttr = {
  "zh-hant": "zh-Hant",
  "zh-hans": "zh-Hans",
  en: "en",
} as const;

/** Open Graph locale (`og:locale`) for each site locale. */
export const ogLocale = {
  "zh-hant": "zh_TW",
  "zh-hans": "zh_CN",
  en: "en_US",
} as const;

export const ui = {
  "zh-hant": {
    nav: {
      about: "關於",
      blog: "文章",
      acg: "ACG",
      contact: "聯絡",
      usefulLink: "連結",
    },
    home: {
      title: "laooozy",
      tagline: "一個關於我自己的網站。",
      nowLabel: "最近",
    },
    blog: {
      heading: "最新文章",
      allPosts: "所有文章",
      filters: "文章篩選",
      byDate: "依時間",
      byTag: "依標籤",
      prev: "上一頁",
      next: "下一頁",
      pageOf: "第 {current} / {last} 頁",
      empty: "這裡還沒有文章。",
      readTime: "約 {minutes} 分鐘閱讀",
      backToIndex: "回到文章列表",
      tagged: "標籤",
    },
    search: {
      trigger: "搜尋",
      title: "搜尋文章",
      placeholder: "搜尋文章…",
      hint: "輸入關鍵字以搜尋所有文章。",
      searching: "搜尋中…",
      noResults: "沒有找到結果。",
      resultCount: "找到 {count} 筆結果",
      close: "關閉搜尋",
    },
    links: {
      title: "實用連結",
    },
    notFound: {
      title: "找不到頁面",
      heading: "找不到頁面",
      body: "你好像來到了甚麼都沒有的地方呢。",
      backHome: "回到首頁",
    },
    button: { viewAll: "查看全部" },
    a11y: {
      skipToContent: "跳至主要內容",
      primaryNav: "主選單",
      language: "語言",
      menu: "選單",
    },
    footer: { rights: "版權所有" },
  },
  "zh-hans": {
    nav: {
      about: "关于",
      blog: "文章",
      acg: "ACG",
      contact: "联系",
      usefulLink: "实用链接",
    },
    home: {
      title: "laooozy",
      tagline: "摄影、游戏，以及我写下的一些东西。",
      nowLabel: "最近",
    },
    blog: {
      heading: "最新文章",
      allPosts: "所有文章",
      filters: "文章筛选",
      byDate: "按时间",
      byTag: "按标签",
      prev: "上一页",
      next: "下一页",
      pageOf: "第 {current} / {last} 页",
      empty: "这里还没有文章。",
      readTime: "约 {minutes} 分钟阅读",
      backToIndex: "返回文章列表",
      tagged: "标签",
    },
    search: {
      trigger: "搜索",
      title: "搜索文章",
      placeholder: "搜索文章…",
      hint: "输入关键词以搜索所有文章。",
      searching: "搜索中…",
      noResults: "没有找到结果。",
      resultCount: "找到 {count} 条结果",
      close: "关闭搜索",
    },
    links: {
      title: "实用链接",
    },
    notFound: {
      title: "找不到页面",
      heading: "找不到页面",
      body: "你要找的页面不存在，或已经被移动了。",
      backHome: "回到首页",
    },
    button: { viewAll: "查看全部" },
    a11y: {
      skipToContent: "跳至主要内容",
      primaryNav: "主菜单",
      language: "语言",
      menu: "菜单",
    },
    footer: { rights: "版权所有" },
  },
  en: {
    nav: {
      about: "About",
      blog: "Blog",
      acg: "ACG",
      contact: "Contact",
      usefulLink: "Useful Links",
    },
    home: {
      title: "laooozy",
      tagline: "Photography, games, and a few things I write down.",
      nowLabel: "Now",
    },
    blog: {
      heading: "Latest posts",
      allPosts: "All posts",
      filters: "Filter posts",
      byDate: "By date",
      byTag: "By tag",
      prev: "Previous",
      next: "Next",
      pageOf: "Page {current} of {last}",
      empty: "No posts yet.",
      readTime: "{minutes} min read",
      backToIndex: "Back to all posts",
      tagged: "Tags",
    },
    search: {
      trigger: "Search",
      title: "Search posts",
      placeholder: "Search posts…",
      hint: "Type to search across all posts.",
      searching: "Searching…",
      noResults: "No results found.",
      resultCount: "{count} results",
      close: "Close search",
    },
    links: {
      title: "Useful Links",
    },
    notFound: {
      title: "Page not found",
      heading: "Page not found",
      body: "The page you're looking for doesn't exist or may have moved.",
      backHome: "Back to home",
    },
    button: { viewAll: "View all" },
    a11y: {
      skipToContent: "Skip to main content",
      primaryNav: "Primary",
      language: "Language",
      menu: "Menu",
    },
    footer: { rights: "All rights reserved" },
  },
} as const;

/** The `ui` dictionary shape (all locales share it). */
export type UI = (typeof ui)[Locale];

/** Union of dotted key paths to translatable string leaves, e.g. `"blog.pageOf"`. */
export type TranslationKey = DotPaths<(typeof ui)["zh-hant"]>;

/** Narrow an arbitrary locale string (e.g. `Astro.currentLocale`) to a known locale. */
export function resolveLocale(locale: string | undefined): Locale {
  return locale && locale in ui ? (locale as Locale) : defaultLang;
}

/**
 * Resolve the locale to apply before first paint from client-side hints.
 *
 * PURE: no DOM, no storage — the caller passes the two raw values so the
 * documented resolution order is unit-testable and shared with the inline boot
 * snippet in `src/client/locale-boot.ts` (which cannot import this module).
 *
 * Order:
 *  1. `stored` wins when it is exactly a supported locale code;
 *  2. otherwise `navigatorLang` is matched case-insensitively by prefix —
 *     `zh-hans`/`zh-cn`/`zh-sg` → `zh-hans`, `en` → `en`;
 *  3. anything else (including `zh-tw`/`zh-hk` and a missing hint) → `zh-hant`.
 */
export function resolveClientLocale(
  stored: string | null,
  navigatorLang: string | null,
): Locale {
  if (stored === "zh-hant" || stored === "zh-hans" || stored === "en") {
    return stored;
  }

  const lang = navigatorLang?.toLowerCase() ?? "";
  if (
    lang.startsWith("zh-hans") ||
    lang.startsWith("zh-cn") ||
    lang.startsWith("zh-sg")
  ) {
    return "zh-hans";
  }
  if (lang.startsWith("en")) return "en";

  return defaultLang;
}

export function useTranslations(locale: Locale): UI {
  return ui[locale] ?? ui[defaultLang];
}

/** Resolve a dotted path against an object, returning `undefined` if absent. */
function readPath(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source;
  for (const part of path) {
    if (
      current !== null &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Pure translation lookup: resolves a dotted `key` against the dictionary for
 * `locale` and interpolates `{var}` placeholders from `vars`.
 *
 * Never throws. If the key is unknown (or resolves to a non-string, e.g. an
 * array branch) the original `key` string is returned as the documented
 * fallback. Missing interpolation variables leave their `{placeholder}` intact.
 */
export function t(
  locale: Locale,
  key: TranslationKey | (string & {}),
  vars?: TranslationVars,
): string {
  const value = readPath(ui[locale] ?? ui[defaultLang], String(key).split("."));
  if (typeof value !== "string") return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
