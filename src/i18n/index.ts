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
  photoIg: "acg.laooozy",
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
      photography: "攝影",
      contact: "聯絡",
      usefulLink: "連結",
      backHome: "回到首頁",
    },
    home: {
      title: "laooozy",
      nowLabel: "最近",
    },
    now: {
      pause: "暫停",
      play: "播放",
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
      pagination: "文章分頁",
      empty: "這裡還沒有文章。",
      readTime: "約 {minutes} 分鐘閱讀",
      readPost: "閱讀文章",
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
      error: "搜尋暫時無法使用，請再試一次。",
      resultCount: "找到 {count} 筆結果",
      close: "關閉搜尋",
      quickLinks: "快速前往",
      recent: "最近搜尋",
      clearRecent: "清除最近搜尋",
      results: "搜尋結果",
      retry: "重試",
      group: {
        blog: "文章",
        music: "音樂",
        pages: "頁面",
      },
    },
    music: {
      searchLabel: "搜尋歌曲",
      searchPlaceholder: "搜尋歌名或歌手…",
      filters: "篩選",
      artistLabel: "歌手",
      organisationLabel: "所屬",
      all: "全部",
      count: "共 {count} 首",
      loading: "載入中…",
      empty: "歌單暫時沒有歌曲。",
      noResults: "沒有符合的歌曲。",
      error: "歌單暫時無法載入，請再試一次。",
      retry: "重試",
      playlistLink: "在 YouTube 開啟歌單",
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
      scrollToTop: "回到頂部",
      scrollToBottom: "跳到頁尾",
    },
    footer: { rights: "版權所有", updated: "更新於" },
  },
  "zh-hans": {
    nav: {
      about: "关于",
      blog: "文章",
      photography: "摄影",
      contact: "联系",
      usefulLink: "实用链接",
      backHome: "回到首页",
    },
    home: {
      title: "laooozy",
      nowLabel: "最近",
    },
    now: {
      pause: "暂停",
      play: "播放",
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
      pagination: "文章分页",
      empty: "这里还没有文章。",
      readTime: "约 {minutes} 分钟阅读",
      readPost: "阅读文章",
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
      error: "搜索暂时无法使用，请再试一次。",
      resultCount: "找到 {count} 条结果",
      close: "关闭搜索",
      quickLinks: "快速前往",
      recent: "最近搜索",
      clearRecent: "清除最近搜索",
      results: "搜索结果",
      retry: "重试",
      group: {
        blog: "文章",
        music: "音乐",
        pages: "页面",
      },
    },
    music: {
      searchLabel: "搜索歌曲",
      searchPlaceholder: "搜索歌名或歌手…",
      filters: "筛选",
      artistLabel: "歌手",
      organisationLabel: "所属",
      all: "全部",
      count: "共 {count} 首",
      loading: "加载中…",
      empty: "歌单暂时没有歌曲。",
      noResults: "没有符合条件的歌曲。",
      error: "歌单暂时无法加载，请再试一次。",
      retry: "重试",
      playlistLink: "在 YouTube 打开歌单",
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
      scrollToTop: "回到顶部",
      scrollToBottom: "跳到底部",
    },
    footer: { rights: "版权所有", updated: "更新于" },
  },
  en: {
    nav: {
      about: "About",
      blog: "Blog",
      photography: "Photography",
      contact: "Contact",
      usefulLink: "Useful Links",
      backHome: "Back to home",
    },
    home: {
      title: "laooozy",
      nowLabel: "Now",
    },
    now: {
      pause: "Pause",
      play: "Play",
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
      pagination: "Blog pagination",
      empty: "No posts yet.",
      readTime: "{minutes} min read",
      readPost: "Read post",
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
      error: "Search is unavailable right now. Please try again.",
      resultCount: "Results: {count}",
      close: "Close search",
      quickLinks: "Quick links",
      recent: "Recent searches",
      clearRecent: "Clear recent searches",
      results: "Search results",
      retry: "Retry",
      group: {
        blog: "Posts",
        music: "Music",
        pages: "Pages",
      },
    },
    music: {
      searchLabel: "Search songs",
      searchPlaceholder: "Search titles or artists…",
      filters: "Filters",
      artistLabel: "Artist",
      organisationLabel: "Organisation",
      all: "All",
      count: "Songs: {count}",
      loading: "Loading…",
      empty: "No songs in this playlist yet.",
      noResults: "No songs match your filters.",
      error: "The playlist is unavailable right now. Please try again.",
      retry: "Retry",
      playlistLink: "Open playlist on YouTube",
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
      scrollToTop: "Back to top",
      scrollToBottom: "Jump to bottom",
    },
    footer: { rights: "All rights reserved", updated: "Updated" },
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
