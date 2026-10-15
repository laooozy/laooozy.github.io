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

/** Open Graph locale (`og:locale`) for each site locale. */
export const ogLocale = {
  "zh-hant": "zh_TW",
  "zh-hans": "zh_CN",
  en: "en_US",
} as const;

export const ui = {
  "zh-hant": {
    nav: { about: "關於", acg: "ACG", blog: "文章", contact: "聯絡" },
    home: {
      title: "laooozy",
      tagline: "攝影、遊戲，與我寫下的一些東西。",
      intro: "嗨，我是 laooozy，住在香港。最近喜歡跑步和拍攝。",
      nowLabel: "最近",
      nowText: "練跑，也練習用相機留住光。",
      baseLabel: "據點",
      baseValue: "香港",
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
      note: "我是剛起步的業餘攝影新手，喜歡拍 cosplayer。",
      cta: "看看我的 ACG 介紹",
    },
    acgPage: {
      title: "ACG 攝影",
      description:
        "一個喜歡拍 cosplayer 的業餘攝影新手，從 2026 年 ACGHK 之後開始拿起相機。",
      back: "回到首頁",
      introHeading: "ACG 攝影",
      introLead: "我是喜歡拍 cosplayer 的業餘攝影新手，2026 年才剛拿起相機。",
      introBody:
        "2026 年我第一次參加 ACGHK。用手機拍下的照片怎麼看都不滿意，於是我買了第一台相機，開始慢慢學。到現在構圖、光線，還有跟 cosplayer 之間的溝通，都還在每天練習。",
      approachHeading: "我的拍攝方式",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder below with the real "approach" copy (title + body).
       * The previous text was AI-invented; it was removed on purpose.
       */
      approach: [
        {
          title: "內容待補",
          body: "「我的拍攝方式」這段內容還沒決定，之後會補上。",
        },
      ],
      commissionHeading: "委託與合作",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder lead + points below with the real commission copy.
       * The previous text was AI-invented; it was removed on purpose.
       */
      commissionLead: "內容待補",
      commissionPoints: ["「委託與合作」這段內容還沒決定，之後會補上。"],
      followHeading: "追蹤我的作品",
      followNote: "作品與約拍資訊，主要都放在 Instagram。",
      followCta: "在 Instagram 看更多",
    },
    blog: {
      heading: "最新文章",
      cta: "閱讀更多",
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
    contact: {
      heading: "聯絡我",
      intro: "想聊攝影、遊戲，或只是打聲招呼，都可以從這裡找到我。",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
    notFound: {
      title: "找不到頁面",
      heading: "找不到頁面",
      body: "你要找的頁面不存在，或已經被移動了。",
      backHome: "回到首頁",
    },
    button: { readMore: "閱讀更多", viewAll: "查看全部" },
    a11y: {
      skipToContent: "跳至主要內容",
      primaryNav: "主選單",
      quickLinks: "快速連結",
      language: "語言",
    },
    footer: { rights: "版權所有" },
  },
  "zh-hans": {
    nav: { about: "关于", acg: "ACG", blog: "文章", contact: "联系" },
    home: {
      title: "laooozy",
      tagline: "摄影、游戏，以及我写下的一些东西。",
      intro: "嗨，我是 laooozy，住在香港。最近喜欢跑步和拍摄。",
      nowLabel: "最近",
      nowText: "练跑，也练习用相机留住光。",
      baseLabel: "据点",
      baseValue: "香港",
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
      note: "我是刚起步的业余摄影新手，喜欢拍 cosplayer。",
      cta: "看看我的 ACG 介绍",
    },
    acgPage: {
      title: "ACG 摄影",
      description:
        "一个喜欢拍 cosplayer 的业余摄影新手，从 2026 年 ACGHK 之后开始拿起相机。",
      back: "回到首页",
      introHeading: "ACG 摄影",
      introLead: "我是喜欢拍 cosplayer 的业余摄影新手，2026 年才刚拿起相机。",
      introBody:
        "2026 年我第一次参加 ACGHK。用手机拍下的照片怎么看都不满意，于是我买了第一台相机，开始慢慢学。到现在构图、光线，还有跟 cosplayer 之间的沟通，都还在每天练习。",
      approachHeading: "我的拍摄方式",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder below with the real "approach" copy (title + body).
       * The previous text was AI-invented; it was removed on purpose.
       */
      approach: [
        {
          title: "内容待补",
          body: "「我的拍摄方式」这段内容还没决定，之后会补上。",
        },
      ],
      commissionHeading: "委托与合作",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder lead + points below with the real commission copy.
       * The previous text was AI-invented; it was removed on purpose.
       */
      commissionLead: "内容待补",
      commissionPoints: ["「委托与合作」这段内容还没决定，之后会补上。"],
      followHeading: "关注我的作品",
      followNote: "作品与约拍信息，主要都放在 Instagram。",
      followCta: "在 Instagram 看更多",
    },
    blog: {
      heading: "最新文章",
      cta: "阅读更多",
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
    contact: {
      heading: "联系我",
      intro: "想聊摄影、游戏，或只是打个招呼，都可以从这里找到我。",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
    notFound: {
      title: "找不到页面",
      heading: "找不到页面",
      body: "你要找的页面不存在，或已经被移动了。",
      backHome: "回到首页",
    },
    button: { readMore: "阅读更多", viewAll: "查看全部" },
    a11y: {
      skipToContent: "跳至主要内容",
      primaryNav: "主菜单",
      quickLinks: "快速链接",
      language: "语言",
    },
    footer: { rights: "版权所有" },
  },
  en: {
    nav: { about: "About", acg: "ACG", blog: "Blog", contact: "Contact" },
    home: {
      title: "laooozy",
      tagline: "Photography, games, and a few things I write down.",
      intro:
        "Hi, I'm laooozy, based in Hong Kong — into running and photography these days.",
      nowLabel: "Now",
      nowText: "Running, and learning to hold light with a camera.",
      baseLabel: "Based in",
      baseValue: "Hong Kong",
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
      note: "I'm a beginner photographer who loves shooting cosplayers.",
      cta: "See my ACG intro",
    },
    acgPage: {
      title: "ACG Photography",
      description:
        "A beginner photographer who shoots cosplayers — it all started at ACGHK 2026.",
      back: "Back to home",
      introHeading: "ACG Photography",
      introLead:
        "I'm an amateur photographer just starting out, and I love shooting cosplayers.",
      introBody:
        "2026 was my first time at a convention — ACGHK. The photos I took on my phone looked bad, so I bought a camera and started learning. Composition, light, and talking with cosplayers are still things I practise a little more each day.",
      approachHeading: "How I shoot",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder below with the real "approach" copy (title + body).
       * The previous text was AI-invented; it was removed on purpose.
       */
      approach: [
        {
          title: "Coming soon",
          body: "This section — how I shoot — hasn't been decided yet. It'll be added later.",
        },
      ],
      commissionHeading: "Commissions & collaboration",
      /*
       * TODO(user): owner hasn't decided this content yet — replace the
       * placeholder lead + points below with the real commission copy.
       * The previous text was AI-invented; it was removed on purpose.
       */
      commissionLead: "Coming soon",
      commissionPoints: [
        "The commissions & collaboration section hasn't been decided yet. It'll be added later.",
      ],
      followHeading: "Follow my work",
      followNote: "My photos and shoot updates mostly live on Instagram.",
      followCta: "See more on Instagram",
    },
    blog: {
      heading: "Latest posts",
      cta: "Read more",
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
    contact: {
      heading: "Get in touch",
      intro:
        "Want to talk photography or games, or just say hi? You can reach me here.",
      instagramLabel: "Instagram",
      emailLabel: "Email",
    },
    notFound: {
      title: "Page not found",
      heading: "Page not found",
      body: "The page you're looking for doesn't exist or may have moved.",
      backHome: "Back to home",
    },
    button: { readMore: "Read more", viewAll: "View all" },
    a11y: {
      skipToContent: "Skip to main content",
      primaryNav: "Primary",
      quickLinks: "Quick links",
      language: "Language",
    },
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
