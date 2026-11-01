/**
 * English chrome dictionary.
 *
 * FIXED CHROME only: nav, footer, search, blog-listing, 404, the links heading
 * and the brand/meta strings. Page content lives in the zh-hant MDX entries
 * (`src/content/pages/*.mdx`) and is never translated.
 */
const en = {
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
  a11y: {
    skipToContent: "Skip to main content",
    primaryNav: "Primary",
    language: "Language",
    menu: "Menu",
    scrollToTop: "Back to top",
    scrollToBottom: "Jump to bottom",
  },
  footer: { rights: "All rights reserved", updated: "Updated" },
} as const;

export default en;
