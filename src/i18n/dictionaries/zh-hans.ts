/**
 * Simplified Chinese chrome dictionary.
 *
 * FIXED CHROME only: nav, footer, search, blog-listing, 404, the links heading
 * and the brand/meta strings. Page content lives in the zh-hant MDX entries
 * (`src/content/pages/*.mdx`) and is never translated.
 */
const zhHans = {
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
  a11y: {
    skipToContent: "跳至主要内容",
    primaryNav: "主菜单",
    language: "语言",
    menu: "菜单",
    scrollToTop: "回到顶部",
    scrollToBottom: "跳到底部",
  },
  footer: { rights: "版权所有", updated: "更新于" },
} as const;

export default zhHans;
