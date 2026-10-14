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
    acgPage: {
      title: "ACG｜coser 攝影",
      description: "以 coser 的身分拍照——一個剛拿起相機的業餘攝影新手。",
      back: "回到首頁",
      introHeading: "Coser 攝影",
      introLead: "我以 coser 的身分拍照，也是剛拿起相機的業餘新手。",
      introBody:
        "2026 年 8 月，我擁有了第一台相機。到現在為止一切都還在學——構圖、光線，還有跟 coser 之間的溝通，都是每天慢慢練習的事。",
      approachHeading: "我的拍攝方式",
      approach: [
        {
          title: "先聊，再拍",
          body: "開拍前我喜歡先跟 coser 聊聊角色與想要的氛圍，讓照片更接近對方心裡想像的樣子。",
        },
        {
          title: "慢慢來",
          body: "我不趕著拍完下一個場景，寧願花時間等一個對的光線與表情。",
        },
        {
          title: "還在學",
          body: "坦白說我還是新手，會出錯、也會邊拍邊調整，但每一次都想比上一次好一點。",
        },
      ],
      commissionHeading: "委託與合作",
      commissionLead: "目前的我：",
      commissionPoints: [
        "目前沒有收費的私人約拍。",
        "朋友之間，免費。",
        "還不算圈內人，只是一個喜歡拍照的 coser。",
        "私訊我都會回，歡迎聊聊。",
      ],
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
      language: "語言",
    },
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
    acgPage: {
      title: "ACG｜coser 摄影",
      description: "以 coser 的身份拍照——一个刚拿起相机的业余摄影新手。",
      back: "回到首页",
      introHeading: "Coser 摄影",
      introLead: "我以 coser 的身份拍照，也是刚拿起相机的业余新手。",
      introBody:
        "2026 年 8 月，我拥有了第一台相机。到现在为止一切都还在学——构图、光线，还有跟 coser 之间的沟通，都是每天慢慢练习的事。",
      approachHeading: "我的拍摄方式",
      approach: [
        {
          title: "先聊，再拍",
          body: "开拍前我喜欢先跟 coser 聊聊角色与想要的氛围，让照片更接近对方心里想像的样子。",
        },
        {
          title: "慢慢来",
          body: "我不赶着拍完下一个场景，宁愿花时间等一个对的光线与表情。",
        },
        {
          title: "还在学",
          body: "坦白说我还是新手，会出错、也会边拍边调整，但每一次都想比上一次好一点。",
        },
      ],
      commissionHeading: "委托与合作",
      commissionLead: "现在的我：",
      commissionPoints: [
        "目前没有收费的私人约拍。",
        "朋友之间，免费。",
        "还不算圈内人，只是一个喜欢拍照的 coser。",
        "私信我都会回，欢迎聊聊。",
      ],
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
    acgPage: {
      title: "ACG | Coser photography",
      description:
        "I shoot as a coser — an amateur who has only just picked up a camera.",
      back: "Back to home",
      introHeading: "Coser photography",
      introLead:
        "I shoot as a coser, and I'm an amateur who has only just picked up a camera.",
      introBody:
        "I got my first camera in August 2026. Everything is still a work in progress — composition, light, and talking with the coser are all things I practise a little more each day.",
      approachHeading: "How I shoot",
      approach: [
        {
          title: "We talk first",
          body: "Before we shoot I like to chat with the coser about the character and the mood they want, so the photos come closer to what they have in mind.",
        },
        {
          title: "Slow and steady",
          body: "I'm in no rush to get to the next scene; I'd rather wait for the right light and the right expression.",
        },
        {
          title: "Still learning",
          body: "Honestly, I'm still new — I'll make mistakes and adjust as I go, but I want each shoot to be a little better than the last.",
        },
      ],
      commissionHeading: "Commissions & collaboration",
      commissionLead: "Where I am right now:",
      commissionPoints: [
        "No paid private shoots for now.",
        "Free between friends.",
        "Not really in the scene — just a coser who likes taking photos.",
        "I reply to every DM, so feel free to reach out.",
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
