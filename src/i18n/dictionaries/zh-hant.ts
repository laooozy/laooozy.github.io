/**
 * Traditional Chinese chrome dictionary (the default/build locale).
 *
 * FIXED CHROME only: nav, footer, search, blog-listing, 404, the links heading
 * and the brand/meta strings. Page content lives in the zh-hant MDX entries
 * (`src/content/pages/*.mdx`) and is never translated.
 */
const zhHant = {
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
  a11y: {
    skipToContent: "跳至主要內容",
    primaryNav: "主選單",
    language: "語言",
    menu: "選單",
    scrollToTop: "回到頂部",
    scrollToBottom: "跳到頁尾",
  },
  footer: { rights: "版權所有", updated: "更新於" },
} as const;

export default zhHant;
