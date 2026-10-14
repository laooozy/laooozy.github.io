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

/** Game titles shown under the "games" interest (locale-independent). */
export const games = [
  "Barotrauma",
  "CS2",
  "Dying Light 2",
  "GTFO",
  "L4D2",
  "RE9",
  "Ready or Not",
  "Slay the Spire 1+2",
  "Sons of the Forest",
  "Stellaris",
] as const;

/** VTuber channels followed under the "vtuber" interest (locale-independent). */
export const vtubers = ["Gura", "Laplus"] as const;

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

export const ui = {
  "zh-hant": {
    nav: { about: "關於", acg: "ACG", blog: "文章", contact: "聯絡" },
    home: {
      title: "laooozy",
      tagline: "攝影、遊戲，與我寫下的一些東西。",
      intro:
        "嗨，我是 laooozy。TODO(user): 在這裡補上一兩句自我介紹——例如你所在的城市、平常在做什麼。",
      interestsHeading: "興趣",
      interests: {
        photography: "攝影",
        photographyNote: "習慣背著相機到處走，慢慢練習觀察光的方向。",
        games: "遊戲",
        gamesNote: "大多是能和別人一起玩、需要彼此配合的作品。",
        vtuber: "虛擬主播",
        vtuberNote: "固定會追的幾個台。",
      },
    },
    about: { heading: "關於我" },
    acg: {
      heading: "ACG",
      note: "我以 coser 的身分拍照，也是剛起步的業餘攝影新手。",
      cta: "看看我的 ACG 介紹",
    },
    blog: {
      heading: "最新文章",
      cta: "閱讀更多",
      allPosts: "所有文章",
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
    contact: {
      heading: "聯絡我",
      intro: "想聊攝影、遊戲，或只是打聲招呼，都可以從這裡找到我。",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
    button: { readMore: "閱讀更多", viewAll: "查看全部" },
    a11y: { skipToContent: "跳至主要內容", primaryNav: "主選單" },
    footer: { rights: "版權所有" },
  },
  "zh-hans": {
    nav: { about: "关于", acg: "ACG", blog: "文章", contact: "联系" },
    home: {
      title: "laooozy",
      tagline: "摄影、游戏，以及我写下的一些东西。",
      intro:
        "嗨，我是 laooozy。喜欢背着相机到处走、和朋友一起玩需要配合的游戏，也固定追几个虚拟主播。TODO(user): 在这里补上你所在的城市与平时在做的事。",
      interestsHeading: "兴趣",
      interests: {
        photography: "摄影",
        photographyNote: "习惯背着相机到处走，慢慢练习观察光的方向。",
        games: "游戏",
        gamesNote: "大多是能和别人一起玩、需要彼此配合的作品。",
        vtuber: "虚拟主播",
        vtuberNote: "固定会追的几个台。",
      },
    },
    about: { heading: "关于我" },
    acg: {
      heading: "ACG",
      note: "我以 coser 的身份拍照，也是刚起步的业余摄影新手。",
      cta: "看看我的 ACG 介绍",
    },
    blog: {
      heading: "最新文章",
      cta: "阅读更多",
      allPosts: "所有文章",
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
    contact: {
      heading: "联系我",
      intro: "想聊摄影、游戏，或只是打个招呼，都可以从这里找到我。",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
    button: { readMore: "阅读更多", viewAll: "查看全部" },
    a11y: { skipToContent: "跳至主要内容", primaryNav: "主菜单" },
    footer: { rights: "版权所有" },
  },
  en: {
    nav: { about: "About", acg: "ACG", blog: "Blog", contact: "Contact" },
    home: {
      title: "laooozy",
      tagline: "Photography, games, and a few things I write down.",
      intro:
        "Hi, I'm laooozy. I carry a camera everywhere, play co-op games that need real teamwork, and follow a couple of VTubers. TODO(user): add your city and what you do day to day.",
      interestsHeading: "Interests",
      interests: {
        photography: "Photography",
        photographyNote:
          "I carry a camera around and keep practising how light falls.",
        games: "Games",
        gamesNote:
          "Mostly titles I can play with others, where we have to work as a team.",
        vtuber: "VTubers",
        vtuberNote: "A small, fixed set of channels I keep up with.",
      },
    },
    about: { heading: "About me" },
    acg: {
      heading: "ACG",
      note: "I shoot as a coser and I'm a newcomer to amateur photography.",
      cta: "See my ACG intro",
    },
    blog: {
      heading: "Latest posts",
      cta: "Read more",
      allPosts: "All posts",
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
    contact: {
      heading: "Get in touch",
      intro:
        "Want to talk photography or games, or just say hi? You can reach me here.",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
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
