# Architecture

This is the internal map of the repository: layers, data flow, ports, content,
routes and the component tree. It describes the tree as it exists today.

Read these first for context this page does not repeat:

- [README](../README.md) for quickstart, commands and authoring.
- [AGENTS](../AGENTS.md) for the load-bearing invariants and the mobile-first
  policy. Those invariants win over anything here.
- [PRODUCT](../PRODUCT.md) for audience, voice and hard constraints.
- [Design system](./design-system.md) for tokens, typography and recipes.
- [Decisions](./decisions.md) for the reason behind each boundary.

## Layer map and dependency direction

```text
src/lib/domain        pure domain logic (no Astro, no DOM, no content APIs)
      |
src/lib/io            thin build-time edge (astro:content, network, fixtures)
      |
src/adapters          browser, network and storage ports plus test doubles
      |
src/client/bootstrap  the ONLY place real adapters are bound to ClientDeps
      |
src/store + hooks     state and React bindings over the injected bundle
      |
src/components        chrome, shared kit and feature UI
src/layouts           document shell and island mounting
src/pages             file-based route shells and the robots endpoint
```

Rules, in the order they matter:

- `src/lib/domain/**` is pure. It may not import `astro:content`, an adapter,
  the store, React or a DOM global. It owns post parsing, sorting, tags,
  periods, paths, reading time, the music payload schema, link parsing and
  search-recents logic. See [posts.ts](../src/lib/domain/posts.ts),
  [filename.ts](../src/lib/domain/filename.ts) and
  [music.ts](../src/lib/domain/music.ts).
- `src/lib/io/**` is the thin build-time edge. It reads content collections and
  external data, then hands plain values to the domain. See
  [io/pages.ts](../src/lib/io/pages.ts), [io/posts.ts](../src/lib/io/posts.ts),
  [io/instagram.ts](../src/lib/io/instagram.ts) and
  [io/site-updated.ts](../src/lib/io/site-updated.ts).
- `src/adapters/**` owns every browser, network and storage effect. A port
  interface, a real adapter and a deterministic test double live in the same
  module. Adapters may import domain validators, never components.
- `src/client/bootstrap.ts` is the single composition root. It constructs the
  real `ClientDeps` bundle and seeds the store from the locale the pre-paint
  boot already applied. See [bootstrap.ts](../src/client/bootstrap.ts).
- `src/store/**` is pure state. It touches no browser global and imports no
  adapter. `src/hooks/**` binds the store and the injected ports to React.
- `src/components/**` and `src/layouts/**` compose the layers. Components do not
  import a real adapter. They read the bundle through `useClientDeps()`, whose
  context default is the composition-root singleton; tests override it with
  `ClientDepsProvider`.
- `src/pages/**` stays thin. It loads content, renders it and supplies the
  layout. It does not own page copy.

## Build-time page render

1. Astro discovers a route under [src/pages](../src/pages) and runs its
   build-time code.
2. A content-backed route loads its entry through [io/pages.ts](../src/lib/io/pages.ts)
   (`renderPage`, `renderPost`, `getLinksEntry`) or uses `getAllPosts()` from
   [io/posts.ts](../src/lib/io/posts.ts). The MDX page bodies live in
   [src/content/pages](../src/content/pages) and the blog Markdown in
   [src/content/blog](../src/content/blog).
3. The route renders the body with Astro and wraps it in
   [BaseLayout.astro](../src/layouts/BaseLayout.astro). Page content is static
   HTML at this point, not a client island.
4. `BaseLayout` emits the document metadata, the inline locale boot script, the
   hashed font preloads, the chrome islands and the page slot.
5. React chrome is server-rendered to static markup by Astro and hydrated on
   the client with the directive written on each island.
6. `astro build` writes `dist/`. `bun run pagefind` then indexes `dist/` once
   with `--force-language zh-hant`.

The `theme-color` meta value is read from
[tokens.css](../src/styles/tokens.css) at build time by `BaseLayout`, so the
browser bar follows `--bg-base` instead of a duplicated hex literal. A missing
token fails the build.

## SEO and robots

`SITE_INDEXABLE` in [seo.ts](../src/lib/seo.ts) is the one indexing switch. It
drives three surfaces:

- the per-page `<meta name="robots" content="noindex, nofollow" />` in
  `BaseLayout`;
- the `@astrojs/sitemap` integration in [astro.config.mjs](../astro.config.mjs);
- the generated [robots.txt](../src/pages/robots.txt.ts), which calls the pure
  `robotsFor()` in [robots.ts](../src/lib/robots.ts).

There is no static `public/robots.txt`. [seo.test.ts](../src/lib/seo.test.ts)
asserts both branches, so the switch and the crawler policy cannot silently
disagree. The site is non-indexable by default.

## Client island flow

1. The browser parses the static HTML. The inline script from
   [locale-boot.ts](../src/client/locale-boot.ts) has already set `<html lang>`
   and `data-locale` before first paint.
2. An island mounts. It reads `ClientDeps` through `useClientDeps()` and
   subscribes to the vanilla store through `useStore`.
3. Locale-reactive text is rendered with `useT()`
   ([useT.ts](../src/hooks/useT.ts)), which re-renders in place when the store
   locale changes. `useHydrationSafeT()` pins the build locale for the first
   render so SSR HTML and the hydration render agree.
4. The language switcher writes the new locale to the store, to
   `document.documentElement` through `DomPort.applyLocale`, and to the
   `StoragePort`. The URL never changes.
5. Vanilla client modules are mounted from a layout script, not from a
   component: `attachScrollHeader` and `attachAtmosphere` both read
   `ClientDeps`. The atmosphere draws on the one animation loop the DOM port
   owns, so there is no second `requestAnimationFrame` loop.

The store is [app-store.ts](../src/store/app-store.ts), built with `createStore`
from `zustand/vanilla`. It owns the active locale, header visibility, the mobile
menu flag and the search state. It never reaches for `window`, `document`,
`localStorage` or `navigator`.

## Locale boot

`LOCALE_BOOT_SCRIPT` is injected inline into `<head>` by `BaseLayout`. It runs
before first paint and is deliberately self-contained plain JS. Resolution
order:

1. `localStorage["locale"]`, when it is exactly a supported code.
2. `navigator.language`, matched by prefix: `zh-hans`, `zh-cn` and `zh-sg` map
   to Simplified Chinese; `en` maps to English.
3. The default, `zh-hant`.

The script sets `<html lang>` to the BCP-47 value and `data-locale` to the
lowercase code. `bootstrap.ts` seeds the store from the already-applied root
value, falling back to storage and then the default. The supported list and the
BCP-47 map are duplicated in the inline script because it cannot import from
`src/i18n`; keep it in sync with `LOCALE_CODES` in
[locales.ts](../src/i18n/locales.ts). The dictionary parity test
([parity.test.ts](../src/i18n/parity.test.ts)) catches chrome drift.

Because the build is static, every page ships the default locale (`zh-hant`)
chrome until an island mounts. A visitor on another locale sees a brief
`zh-hant` flash. That is an accepted trade-off, documented in
[AGENTS](../AGENTS.md).

## One store, one UI state model

There is one state library: [app-store.ts](../src/store/app-store.ts). It is a
module-scope Zustand vanilla store, shared by every island and by vanilla client
code. Do not add a second store, a React context store or a second state
library. The shape lives in [store/types.ts](../src/store/types.ts).

Hooks are adapters over the store and the injected ports:

| Hook                                                      | Responsibility                                      |
| :-------------------------------------------------------- | :-------------------------------------------------- |
| [useT.ts](../src/hooks/useT.ts)                           | Locale-bound `t()` that re-renders on locale change |
| [useHydrationSafeT.ts](../src/hooks/useHydrationSafeT.ts) | Pins the build locale until the first client render |
| [useLocale.ts](../src/hooks/useLocale.ts)                 | Reads and sets the active locale                    |
| [useSearch.ts](../src/hooks/useSearch.ts)                 | Debounced Pagefind search through `PagefindPort`    |

The injection contract is [hooks/deps.ts](../src/hooks/deps.ts), and the React
context is
[ClientDepsContext.tsx](../src/components/shared/ClientDepsContext.tsx).

## Ports and adapters

Every browser, network and storage effect sits behind a port. Each port module
exports an interface, one real adapter and at least one deterministic double.
Adapters are bound only in [bootstrap.ts](../src/client/bootstrap.ts).

| Port                                                                      | Real adapter            | Test double                    | What it hides                                                                      |
| :------------------------------------------------------------------------ | :---------------------- | :----------------------------- | :--------------------------------------------------------------------------------- |
| `StoragePort` ([storage.ts](../src/adapters/storage.ts))                  | `localStorageAdapter`   | `memoryStorageAdapter`         | `localStorage`, with an in-memory fallback when storage is blocked                 |
| `LocaleSourcePort` ([locale-source.ts](../src/adapters/locale-source.ts)) | `navigatorLocaleSource` | `fixedLocaleSource`            | `navigator.language`                                                               |
| `DomPort` ([dom/](../src/adapters/dom/))                                  | `domAdapter`            | `noopDomAdapter`               | Scroll, motion, focus, locale application, script injection and global event seams |
| `PagefindPort` ([pagefind.ts](../src/adapters/pagefind.ts))               | `pagefindAdapter`       | `fakePagefind`                 | The lazy Pagefind import and result mapping                                        |
| `MusicPort` ([music.ts](../src/adapters/music.ts))                        | `musicAdapter`          | `fakeMusic` / `fakeMusicError` | The remote gzip payload, the 10 second abort and typed fetch errors                |

`ClientDeps` is the bundle every client consumer accepts:

```ts
interface ClientDeps {
  store: StoreApi<AppStore>;
  adapters: {
    storage: StoragePort;
    localeSource: LocaleSourcePort;
    dom: DomPort;
    pagefind: PagefindPort;
    music: MusicPort;
  };
}
```

`DomPort` is implemented as cohesive slices under
[`src/adapters/dom/`](../src/adapters/dom/): `scroll`, `motion`, `focus`,
`locale`, `scripts` and `events`, assembled by `createDomAdapter`. The `events`
slice owns the only document-level keydown/pointerdown subscriptions, the
reversible body scroll lock (`DomPort.setBodyScrollLocked`, which restores the
prior inline `overflow`) and the lazy `isApplePlatform` probe. Components
receive the aggregate port through `ClientDeps`; none subscribes to a browser
global itself. Do not add a second animation loop or a second event system.

Enforcement is structural and linted. [eslint.config.js](../eslint.config.js)
errors on adapter imports outside the composition root and on `document`,
`window`, `navigator` and `localStorage` inside `src/components/**`. CI runs
ESLint with `--max-warnings 0`.

## Hydration policy

Only the following surfaces are hydrated React islands:

| Directive     | Island             | Mounted by                                            | Routes                                                   |
| :------------ | :----------------- | :---------------------------------------------------- | :------------------------------------------------------- |
| `client:load` | `SiteHeader`       | [BaseLayout.astro](../src/layouts/BaseLayout.astro)   | every route                                              |
| `client:load` | `LanguageSwitcher` | `BaseLayout`, nested in `SiteHeader`                  | every route                                              |
| `client:idle` | `SearchCommand`    | `BaseLayout`                                          | every route                                              |
| `client:load` | `SiteFooter`       | `BaseLayout`                                          | every route                                              |
| `client:load` | `ScrollControls`   | `BaseLayout`                                          | every route                                              |
| `client:load` | `NotFound`         | [404.astro](../src/pages/404.astro)                   | `/404`                                                   |
| `client:load` | `PostHeader`       | [blog/[slug].astro](../src/pages/blog/[slug].astro)   | `/blog/<id>/`                                            |
| `client:load` | `BlogList`         | [BlogListing.astro](../src/layouts/BlogListing.astro) | `/blog/`, `/blog/tags/<tag>/`, `/blog/archive/<period>/` |
| `client:load` | `MusicLibrary`     | [music.mdx](../src/content/pages/music.mdx)           | `/music/`                                                |
| `client:load` | `NowTicker`        | `components/site/NowTicker.astro`                     | `/` only when `src/data/now.json` has items              |
| `client:idle` | `InstagramGate`    | `components/photography/InstagramWall.astro`          | `/photographer/`                                         |

Everything else is Astro or MDX rendered at build time:

- `/` and `/photographer/` are MDX entries rendered by thin route shells
  ([index.astro](../src/pages/index.astro),
  [photographer.astro](../src/pages/photographer.astro)).
- `/blog/<id>/` keeps the Markdown body Astro-rendered; only `PostHeader` is an
  island.
- `/links/` renders one Markdown entry at build time
  ([links.astro](../src/pages/links.astro)). Its heading uses the static
  `[data-l]` toggle, so the page is not an island.
- `/music/` is the one page-level island. Its MDX shell mounts `MusicLibrary`
  and a `<noscript>` link-out; the library section carries
  `data-pagefind-ignore`.

`SearchCommand` is a sibling of the header, never a child, and lazy-loads its
dialog chunk on first open. The Instagram gate injects `embed.js` only after a
click, through `DomPort.loadScript`.

## Content model

### Single URL space

There is one set of URLs for all locales. The locale is client state, never a
path segment. There are no `/en/` or `/zh-hans/` folders, no locale-prefixed
routes and no `hreflang` alternates. Current routes:

| Route                     | Source                                                                                                               |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| `/`                       | [home.mdx](../src/content/pages/home.mdx) plus [index.astro](../src/pages/index.astro)                               |
| `/photographer/`          | [photographer.mdx](../src/content/pages/photographer.mdx) plus [photographer.astro](../src/pages/photographer.astro) |
| `/music/`                 | [music.mdx](../src/content/pages/music.mdx) plus [music.astro](../src/pages/music.astro)                             |
| `/links/`                 | [links/index.md](../src/content/links/index.md) plus [links.astro](../src/pages/links.astro)                         |
| `/blog/`                  | paginated listing from [blog/[...page].astro](../src/pages/blog)                                                     |
| `/blog/<id>/`             | [blog/[slug].astro](../src/pages/blog/[slug].astro)                                                                  |
| `/blog/tags/<tag>/`       | [blog/tags/[tag].astro](../src/pages/blog/tags/[tag].astro)                                                          |
| `/blog/archive/<period>/` | [blog/archive/[period].astro](../src/pages/blog/archive/[period].astro)                                              |
| `/404`                    | [404.astro](../src/pages/404.astro)                                                                                  |
| `/robots.txt`             | [robots.txt.ts](../src/pages/robots.txt.ts)                                                                          |

### Blog posts

Every post is one Markdown file in [src/content/blog](../src/content/blog)
named `yyyy-mm-dd_<slug>.md`. The filename date is the source of truth. There
is no frontmatter `date` and no `slug` field: the date comes from
`postDateString(post)` and the URL from `post.id`. The slug is lowercase
`a-z`/`0-9` segments joined by single hyphens. A Vitest guard
([blog-filenames.test.ts](../src/lib/io/blog-filenames.test.ts)) parses every
filename with `parsePostFilename` and fails CI on a bad name.

Frontmatter is typed in [content.config.ts](../src/content.config.ts):
`title`, `description`, `tags` (default `[]`) and `draft` (default `false`).
Drafts are excluded from every listing. The authoring rules are in
[README](../README.md#content); do not duplicate them in code comments.

### Links and MDX pages

- The whole `/links/` list is one Markdown file,
  [links/index.md](../src/content/links/index.md). Its optional frontmatter is
  `title` and `description`. The visible heading is fixed chrome from
  `src/i18n`, not Markdown.
- The `pages` collection holds whole page bodies:
  [home.mdx](../src/content/pages/home.mdx),
  [photographer.mdx](../src/content/pages/photographer.mdx) and
  [music.mdx](../src/content/pages/music.mdx). Each entry accepts optional
  `title` and `description`.
- Page bodies are MDX and import the shared kit directly
  (`src/components/shared/**`, plus the thin Astro wrappers in `site/`,
  `blog/` and `photography/`). There are no compatibility shims. Page imports
  are explicit, props carry structure and the default slot carries authored
  Markdown. A missing import is a build error.

Page content stays zh-hant in every locale. Fixed chrome lives in
[i18n/index.ts](../src/i18n/index.ts) and is the only translated surface.

### Music pipeline

`/music/` is the one page-level island, and its data is generated, not
authored.

1. [scripts/music/fetch.mjs](../scripts/music/fetch.mjs) runs `yt-dlp` over the
   playlist in `scripts/music/playlist.json`, normalizes the dump and writes one
   gzipped payload.
2. [.github/workflows/music.yml](../.github/workflows/music.yml) runs on a daily
   cron (`17 18 * * *`), on `workflow_dispatch`, and on pushes to `main` that
   touch `scripts/music/**` or the workflow. It installs the latest unpinned
   `yt-dlp` and force-pushes `music.json.gz` to the orphan `music_asset` branch.
3. The browser fetches that one file through `MusicPort`. The adapter sniffs
   gzip versus plain, aborts after 10 seconds, and validates the payload with
   `parseMusicPayload` from [domain/music.ts](../src/lib/domain/music.ts).
4. `MusicLibrary` filters the validated payload client-side. Its section is
   `data-pagefind-ignore`, so song titles and artist names never enter the
   search index.

The pipeline fails closed: a failed fetch, a partial extractor run, an empty
payload or a blank title exits 1 and leaves `music_asset` untouched. The last
good payload stays published. Generated playlist data is never committed to
`main`.

## Styling, shadcn and the shared kit

`components.json` sets `"style": "base-nova"`, the Base UI flavor of shadcn,
not Radix. The peer is `@base-ui/react`. Interaction props use `render` (for
example `DialogPrimitive.Close render={<Button />}`), not `asChild`. There is
no `@radix-ui/*` dependency and no second UI library.

- `cn` is the `cn` npm package (clsx plus tailwind-merge behavior). The
  convenience re-export is [src/lib/utils.ts](../src/lib/utils.ts); generated
  files import `{ cn } from "cn"` directly.
- `class-variance-authority` (`cva`) owns variant maps in generated primitives
  and brand components.
- [src/components/ui](../src/components/ui) is vendored, generated code. Do not
  hand-edit it for brand changes. Branding comes from tokens and, where a
  component genuinely needs a new look, a variant on a wrapper outside the
  generated file.
- [src/components/shared](../src/components/shared) is the one feature-neutral
  kit: `layout/`, `typography/`, `state/`, `compositions/`, `ChipRow`,
  `Section`, `InterestCard`, `PhotographyMasthead`, `Cta`, `ContactRow`,
  `HeroView` and `HeroMeta`. It holds no store, no adapter and no feature hook.
- Feature folders own feature state: `site/`, `blog/`, `music/`, `photography/`
  and `links/`.

See [Design system](./design-system.md) for tokens, typography, the primitive
inventory and the component recipe.

## Component folder map

| Path                                                    | Contents                                                                                                                                                                                                                                         |
| :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [components/ui](../src/components/ui)                   | Generated shadcn base-nova primitives only.                                                                                                                                                                                                      |
| [components/site](../src/components/site)               | Feature chrome: `SiteHeader`, `SiteFooter`, `ScrollControls`, `LanguageSwitcher`, `SearchCommand`, `SearchCommandDialog`, `NotFound`, `T`, `NowTickerClient`, plus the thin Astro wrappers `Hero.astro`, `NowTicker.astro` and `BackLink.astro`. |
| [components/blog](../src/components/blog)               | `BlogList`, `BlogFilters`, `BlogPagination`, `BlogEmpty`, `BlogEmptyView`, `PostCard`, `PostCardView`, `PostHeader`, plus the build-time `LatestPosts.astro`.                                                                                    |
| [components/music](../src/components/music)             | `MusicLibrary`.                                                                                                                                                                                                                                  |
| [components/photography](../src/components/photography) | `InstagramGate` and the build-time `InstagramWall.astro`.                                                                                                                                                                                        |
| [components/links](../src/components/links)             | `LinksList`.                                                                                                                                                                                                                                     |
| [components/shared](../src/components/shared)           | The one feature-neutral kit: `layout/`, `typography/`, `state/`, `compositions/` and the shared page primitives.                                                                                                                                 |
| [layouts](../src/layouts)                               | `BaseLayout.astro` and `BlogListing.astro`.                                                                                                                                                                                                      |

`src/components/site/T.tsx` is a static all-locale component, not an island. It
renders the same key in all three locales and lets CSS pick one.

The Astro wrappers stay `.astro` because they need build-time I/O or a
`client:*` directive: `site/Hero.astro` and `site/NowTicker.astro` place
`client:load` islands, `blog/LatestPosts.astro` and
`photography/InstagramWall.astro` use top-level `await`. Their React bodies live
in `shared/` (`HeroView`, `HeroMeta`, `PostCardView`, `BlogEmptyView`) and in
`photography/InstagramGate`.

## Testing and CI

| Command                | What it runs                                           | Gate           |
| :--------------------- | :----------------------------------------------------- | :------------- |
| `bun run test`         | Vitest unit and component tests                        | CI quality job |
| `bun run typecheck`    | `astro check` over `.astro` and `.ts`                  | CI quality job |
| `bun run lint`         | ESLint flat config with `--max-warnings 0`             | CI quality job |
| `bun run format:check` | Prettier over the repo                                 | CI quality job |
| `bun run knip`         | Dead-code and unused-export check                      | CI quality job |
| `bun run build`        | `astro build` into `dist/`                             | CI build job   |
| `bun run pagefind`     | One index over `dist/` with `--force-language zh-hant` | CI build job   |
| `bun run test:links`   | Internal link check over `dist/`                       | CI build job   |
| `bun run size`         | size-limit bundle budgets                              | CI build job   |
| `bun run test:e2e`     | Playwright journeys and chrome behavior                | CI browser job |
| `bun run test:a11y`    | Playwright axe and contrast checks                     | CI browser job |
| `bun run test:visual`  | Screenshot regression against committed baselines      | CI browser job |

The browser jobs build one fixture artifact with `bun run e2e:build` and serve
it with `PLAYWRIGHT_SERVE_DIST=1`. The visual baselines live in
[tests/e2e/**screenshots**](../tests/e2e/__screenshots__) and are pinned to
Linux Chromium, DPR 1 and Noto Sans CJK. A visual change updates its baseline
with `bun run test:visual -- --update-snapshots` and reviews the diff.

[CI](../.github/workflows/ci.yml) runs quality, build and browser jobs, then
deploys `main` to GitHub Pages. The separate music pipeline is
[.github/workflows/music.yml](../.github/workflows/music.yml). There is no
manual deploy command.

## Invariants in one line each

These are summaries. [AGENTS](../AGENTS.md#architecture-invariants) is the
source of truth.

- One URL space, client-side locale, accepted pre-hydration default-locale
  flash.
- Browser effects behind ports in `src/adapters`, wired only in
  `src/client/bootstrap.ts`.
- One Zustand vanilla store. One animation loop, owned by `DomPort`.
- React serves interactive and locale-reactive surfaces plus page primitives
  that need props or hooks; page bodies are MDX rendered at build time.
- `src/lib/domain` is pure; `src/lib/io` is the I/O edge.
- One shared primitive kit in `src/components/shared`; no MDX shims.
- Blog filenames are the date source; no frontmatter `date` or `slug`.
- Fixed chrome is translated; page content stays zh-hant.
- Pagefind indexes `dist/` once with `--force-language zh-hant`; `/music/` rows
  are excluded.
- `music_asset` is the only source of the music list.
- The footer stamp is committed and rewritten by the pre-commit hook.
- `SITE_INDEXABLE` is the one indexing switch; `robots.txt` is generated.
