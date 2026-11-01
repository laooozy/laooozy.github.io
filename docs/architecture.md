# Architecture

This is the internal map of the repository: layers, data flow, ports, content
and the component layout. It describes the tree as it exists today, with a
clearly marked migration section for the in-flight architecture refactor.

Read these first for context this page deliberately does not repeat:

- [README](../README.md) for the product, authoring guides and deploy flow.
- [AGENTS](../AGENTS.md) for the load-bearing invariants and the mobile-first
  policy. The invariants there win over anything here.
- [PRODUCT](../PRODUCT.md) for voice and product intent.
- [Design system](./design-system.md) for tokens, typography, primitives,
  breakpoints and component recipes.
- [Refactor plan](../.omo/plans/architecture-artwork-refactor.md) for the tasks
  that are changing this map.

Verified against the tree at the task 7 checkpoint, after commit `abaac18`
(`feat(typography): use tailwind typography for prose`). The refactor plan is
still in flight, so every future path or behavior below is labelled **migration
in progress** rather than stated as current.

## Layer map and dependency direction

```
src/lib/domain       pure domain logic (no Astro, no DOM, no content APIs)
      |
src/lib/io           thin I/O edge (astro:content, network, build-time reads)
      |
src/adapters         browser / network / storage ports plus their test doubles
      |
src/client/bootstrap the ONLY place real adapters are bound to a ClientDeps bundle
      |
src/store + hooks    state and React bindings over the injected bundle
      |
src/components       chrome, page kit and feature UI
src/layouts          document shell and island mounting
src/pages            file-based route shells
```

Dependency rules, in the order they matter:

- `src/lib/domain/**` is pure. It may not import `astro:content`, any adapter,
  the store, React or a DOM global. It owns post parsing, sorting, tags,
  periods, paths, reading time, the music payload schema and filter logic.
  Examples: [posts.ts](../src/lib/domain/posts.ts),
  [filename.ts](../src/lib/domain/filename.ts),
  [music.ts](../src/lib/domain/music.ts).
- `src/lib/io/**` is the thin build-time edge. It reads content collections and
  external data, then hands plain values to the domain. See
  [io/posts.ts](../src/lib/io/posts.ts),
  [io/instagram.ts](../src/lib/io/instagram.ts) and
  [io/site-updated.ts](../src/lib/io/site-updated.ts).
- `src/adapters/**` owns every browser, network and storage effect. A port
  interface plus a real adapter plus a deterministic test double live in the
  same module. Adapters may import domain validators, never components.
- `src/client/bootstrap.ts` is the single composition root. It constructs the
  real `ClientDeps` bundle and seeds the store from the locale the pre-paint
  boot already applied. See [bootstrap.ts](../src/client/bootstrap.ts).
- `src/store/**` is pure state. It touches no browser global and imports no
  adapter. `src/hooks/**` binds the store and the injected ports to React.
- `src/components/**` and `src/layouts/**` compose the layers. Components must
  not import a real adapter. Today they receive or import the already-built
  `clientDeps` bundle, and the refactor is tightening that seam: Task 38 closes
  the remaining browser-global leaks and Task 44 adds an AST boundary test.
- `src/pages/**` stays thin. It loads content, renders it and supplies the
  layout. It does not own page copy.

## Build-time page render

1. Astro discovers a route under [src/pages](../src/pages) and runs its build-
   time code.
2. Content-backed routes load their entry through `getEntry` / `render`, or use
   `getAllPosts()` from [io/posts.ts](../src/lib/io/posts.ts). The MDX page
   bodies live in [src/content/pages](../src/content/pages) and the blog
   Markdown in [src/content/blog](../src/content/blog).
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

## Client island flow

1. The browser parses the static HTML. The inline script from
   [locale-boot.ts](../src/client/locale-boot.ts) has already set `<html lang>`
   and `data-locale` before first paint.
2. An island mounts. It obtains `clientDeps` (today by importing the singleton
   from the composition root) and subscribes to the vanilla store through
   `useStore`.
3. Locale-reactive text is rendered with `useT(clientDeps)`
   ([useT.ts](../src/hooks/useT.ts)), which re-renders in place when the store
   locale changes.
4. The language switcher writes the new locale to the store, to
   `document.documentElement`, and to the `StoragePort`. The URL never changes.
5. Vanilla client modules are mounted from a layout script, not from a
   component: `attachScrollHeader` and `attachAtmosphere` both read
   `clientDeps`. The atmosphere draws on the one animation loop the DOM port
   owns, so there is no second `requestAnimationFrame` loop.

The store singleton is [app-store.ts](../src/store/app-store.ts), built with
`createStore` from `zustand/vanilla`. It owns the active locale, header
visibility, the mobile menu flag and the search state. It never reaches for
`window`, `document`, `localStorage` or `navigator`.

## Locale boot

`LOCALE_BOOT_SCRIPT` is injected inline into `<head>` by `BaseLayout`. It runs
before first paint and is deliberately self-contained plain JS. Resolution
order:

1. `localStorage["locale"]`, when it is exactly a supported code.
2. `navigator.language`, matched by prefix: `zh-hans`, `zh-cn` and `zh-sg` map
   to Simplified Chinese; `en` maps to English.
3. The default, `zh-hant`.

The script sets `<html lang>` to the BCP-47 value and `data-locale` to the
lowercase code, then persists the choice. `bootstrap.ts` seeds the store from
the already-applied root value, falling back to storage and then the default.
The supported list and the BCP-47 map are duplicated in the inline script
because it cannot import from `src/i18n`. Keep it in sync with
`resolveClientLocale` in [i18n/index.ts](../src/i18n/index.ts). The dictionary
key parity test in [parity.test.ts](../src/i18n/parity.test.ts) catches locale
dictionary drift, and the boot map is a manual sync point.

Because the build is static, every page ships the default locale (`zh-hant`)
chrome until an island mounts. A visitor on another locale sees a brief
`zh-hant` flash. That is an accepted trade-off, documented in
[AGENTS](../AGENTS.md).

## One store, one UI state model

There is one state library: [app-store.ts](../src/store/app-store.ts). It is a
module-scope Zustand vanilla store, shared by every island and by vanilla
client code. Do not add a second store, a React context store or a second state
library. The shape lives in [store/types.ts](../src/store/types.ts).

Hooks are pure adapters over the store and the injected ports:

| Hook                                                  | Responsibility                                      |
| :---------------------------------------------------- | :-------------------------------------------------- |
| [useT.ts](../src/hooks/useT.ts)                       | Locale-bound `t()` that re-renders on locale change |
| [useLocale.ts](../src/hooks/useLocale.ts)             | Reads and sets the active locale                    |
| [useSearch.ts](../src/hooks/useSearch.ts)             | Debounced Pagefind search through `PagefindPort`    |
| [useScrollHeader.ts](../src/hooks/useScrollHeader.ts) | Header visibility from `DomPort` scroll events      |

The injection contract is [hooks/deps.ts](../src/hooks/deps.ts).

## Ports and adapters

Every browser, network and storage effect sits behind a port. Each port module
exports an interface, one real adapter and at least one deterministic double.
Adapters are bound only in [bootstrap.ts](../src/client/bootstrap.ts).

| Port                                                                      | Real adapter            | Test double                    | What it hides                                                                                                              |
| :------------------------------------------------------------------------ | :---------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `StoragePort` ([storage.ts](../src/adapters/storage.ts))                  | `localStorageAdapter`   | `memoryStorageAdapter`         | `localStorage`, with an in-memory fallback when storage is blocked                                                         |
| `LocaleSourcePort` ([locale-source.ts](../src/adapters/locale-source.ts)) | `navigatorLocaleSource` | `fixedLocaleSource`            | `navigator.language`                                                                                                       |
| `DomPort` ([dom/](../src/adapters/dom/))                                  | `domAdapter`            | `noopDomAdapter`               | Scroll, motion and the shared frame loop, header focus stability, locale application, script injection, global event seams |
| `PagefindPort` ([pagefind.ts](../src/adapters/pagefind.ts))               | `pagefindAdapter`       | `fakePagefind`                 | The lazy Pagefind import and result mapping                                                                                |
| `MusicPort` ([music.ts](../src/adapters/music.ts))                        | `musicAdapter`          | `fakeMusic` / `fakeMusicError` | The remote gzip payload, the 10 second abort and typed fetch errors                                                        |

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

Enforcement today is incremental. [eslint.config.js](../eslint.config.js) warns
on adapter imports outside the composition root and on `document`, `window`,
`navigator` and `localStorage` inside `src/components/**`. Task 38 removes the
remaining leaks, Task 44 adds a TypeScript AST boundary test, and Task 50 flips
the rules to errors with `--max-warnings 0`. Until then, treat the warnings as
real debt, not noise.

`DomPort` is implemented as cohesive slices under
[`src/adapters/dom/`](../src/adapters/dom/): `scroll`, `motion`, `focus`,
`locale`, `scripts` and `events`, assembled by `createDomAdapter`. The
`events` slice owns the only document-level keydown/pointerdown subscriptions,
the reversible body scroll lock (`DomPort.setBodyScrollLocked`, which restores
the prior inline `overflow`) and the lazy `isApplePlatform` probe. Components
receive the aggregate port through `ClientDeps`; none subscribes to a browser
global itself. Do not add a second animation loop or a second event system.

## Hydration policy today

Only fixed chrome and one page-level exception are hydrated React islands. The
current exact inventory:

| Directive     | Island             | Mounted by                                          | Routes                                                   |
| :------------ | :----------------- | :-------------------------------------------------- | :------------------------------------------------------- |
| `client:load` | `SiteHeader`       | [BaseLayout.astro](../src/layouts/BaseLayout.astro) | every route                                              |
| `client:idle` | `LanguageSwitcher` | `BaseLayout`, nested in `SiteHeader`                | every route                                              |
| `client:load` | `SiteFooter`       | `BaseLayout`                                        | every route                                              |
| `client:load` | `ScrollControls`   | `BaseLayout`                                        | every route                                              |
| `client:load` | `NotFound`         | [404.astro](../src/pages/404.astro)                 | `/404`                                                   |
| `client:load` | `PostArticle`      | `src/pages/blog/[slug].astro`                       | `/blog/<id>/`                                            |
| `client:load` | `BlogList`         | the three blog listing routes                       | `/blog/`, `/blog/tags/<tag>/`, `/blog/archive/<period>/` |
| `client:idle` | `SearchModal`      | the same three blog listing routes                  | same                                                     |
| `client:load` | `MusicLibrary`     | [music.mdx](../src/content/pages/music.mdx)         | `/music/`                                                |
| `client:load` | `NowTickerClient`  | `components/site/NowTicker.astro`                   | `/` when `src/data/now.json` has items                   |
| `client:idle` | `InstagramGate`    | `components/photography/InstagramWall.astro`        | `/photographer/`                                         |

The rest is Astro-rendered at build time:

- `/` and `/photographer/` are MDX entries rendered by thin route shells
  ([index.astro](../src/pages/index.astro),
  [photographer.astro](../src/pages/photographer.astro)).
- `/blog/<id>/` keeps the Markdown body Astro-rendered; only the article chrome
  is an island.
- `/links/` renders one Markdown entry at build time
  ([links.astro](../src/pages/links.astro)). Its heading uses the static
  `[data-l]` toggle, so the page is not an island.

**Migration in progress.** Task 18 replaced `SearchModal` with the global
`SearchCommand` command palette mounted as a sibling island in `BaseLayout`.
Task 38 moved its `⌘K` listener onto `DomPort.onKeyDown`, so no component
subscribes to `document`/`window`/`navigator` directly; the header and
language switcher use the port and hydrated primitives.

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
| `/blog/<id>/`             | `blog/[slug].astro`                                                                                                  |
| `/blog/tags/<tag>/`       | `blog/tags/[tag].astro`                                                                                              |
| `/blog/archive/<period>/` | `blog/archive/[period].astro`                                                                                        |
| `/404`                    | [404.astro](../src/pages/404.astro)                                                                                  |

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
Drafts are excluded from every listing. The full authoring rules are in
[README](../README.md#adding-a-post); do not duplicate them in code comments.

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
- Page bodies are authored in MDX and import compatibility shims from
  [src/components/mdx](../src/components/mdx); each shim forwards to its real
  implementation in `shared/`, `site/`, `blog/` or `photography/`. The shim
  contract is documented in
  [mdx/README.md](../src/components/mdx/README.md). Page imports are explicit,
  props carry structure, and the default slot carries authored Markdown. Task 42
  deletes the `mdx/` directory once Tasks 25/27 migrate the page imports.

Page content stays zh-hant in every locale. Fixed chrome lives in
[i18n/index.ts](../src/i18n/index.ts) and is the only translated surface.

### Music pipeline

`/music/` is the one page-level island, and its data is generated, not
authored.

1. [scripts/music/fetch.mjs](../scripts/music/fetch.mjs) runs `yt-dlp` over the
   playlist in `scripts/music/playlist.json`, normalizes the dump and writes
   one gzipped payload.
2. [.github/workflows/music.yml](../.github/workflows/music.yml) runs on a
   daily cron (`17 18 * * *`), on `workflow_dispatch`, and on pushes to `main`
   that touch `scripts/music/**` or the workflow. It installs the latest
   unpinned `yt-dlp` and force-pushes `music.json.gz` to the orphan
   `music_asset` branch.
3. The browser fetches that one file through `MusicPort`. The adapter sniffs
   gzip versus plain, aborts after 10 seconds, and validates the payload with
   `parseMusicPayload` from
   [domain/music.ts](../src/lib/domain/music.ts).
4. `MusicLibrary` filters the validated payload client-side. Its section is
   `data-pagefind-ignore`, so song titles and artist names never enter the
   search index.

The pipeline fails closed: a failed fetch, a partial extractor run, an empty
payload or a blank title exits 1 and leaves `music_asset` untouched. The last
good payload stays published. Generated playlist data is never committed to
`main`.

## shadcn base and the generated UI

`components.json` sets `"style": "base-nova"`, which is the Base UI flavor of
shadcn, not Radix. The peer is `@base-ui/react`. Interaction props use
`render` (for example `DialogPrimitive.Close render={<Button />}`), not
`asChild`. There is no `@radix-ui/*` dependency and no second UI library.

- `cn` is the `cn` npm package (clsx plus tailwind-merge behavior). The
  convenience re-export is [src/lib/utils.ts](../src/lib/utils.ts); generated
  files import `{ cn } from "cn"` directly.
- `class-variance-authority` (`cva`) owns variant maps in generated primitives
  and in brand components.
- `src/components/ui/**` is vendored, generated code. Do not hand-edit it for
  brand changes. Branding comes from tokens and, where a component genuinely
  needs a new look, a variant on a wrapper outside the generated file. See
  [Design system](./design-system.md) for the full primitive inventory and the
  component recipe.
- `src/components/ui/**` is generated shadcn output. Do not hand-edit it.

## Component folder map

### Current (on disk after Task 14)

| Path                                                    | Contents                                                                                                                                                                                                                |
| :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [components/ui](../src/components/ui)                   | Generated shadcn base-nova primitives only.                                                                                                                                                                             |
| [components/site](../src/components/site)               | Feature chrome: `SiteHeader`, `SiteFooter`, `ScrollControls`, `LanguageSwitcher`, `SearchModal`, `NotFound`, `T`, `NowTickerClient`, plus the thin Astro wrappers `Hero.astro` and `NowTicker.astro`.                   |
| [components/blog](../src/components/blog)               | `BlogList`, `BlogFilters`, `BlogPagination`, `BlogEmpty`, `BlogEmptyView`, `PostCard`, `PostCardView`, `PostArticle`, plus the build-time `LatestPosts.astro`.                                                          |
| [components/music](../src/components/music)             | `MusicLibrary`.                                                                                                                                                                                                         |
| [components/photography](../src/components/photography) | `InstagramGate` and the build-time `InstagramWall.astro`.                                                                                                                                                               |
| [components/shared](../src/components/shared)           | Feature-neutral kit: `layout/`, `typography/`, `state/`, `compositions/`, `ChipRow`, `Section`, `InterestCard`, `PhotographyMasthead`, `Cta`, `ContactRow`, `HeroView`, `HeroMeta`, `Card` and the shared prop `types`. |
| [components/mdx](../src/components/mdx)                 | Compatibility shims ONLY. Each file forwards to the path above; the directory is deleted in Task 42 after Tasks 25/27 migrate the MDX page imports.                                                                     |
| [layouts](../src/layouts)                               | `BaseLayout.astro`.                                                                                                                                                                                                     |

`src/components/site/T.tsx` is a static all-locale component, not an island. It
renders the same key in all three locales and lets CSS pick one.

The four Astro wrappers stay `.astro` because they need build-time I/O or a
`client:*` directive: `site/Hero.astro` and `site/NowTicker.astro` place
`client:load` islands, `blog/LatestPosts.astro` and
`photography/InstagramWall.astro` use top-level `await`. Their React bodies live
in `shared/` (`HeroView`, `HeroMeta`, `PostCardView`, `BlogEmptyView`) and in
`photography/InstagramGate`.

The `mdx/` shims (including the `Cta`/`ContactRow` shims) exist only so
`home.mdx` and `photographer.mdx` keep building with their old import paths;
they are not a second implementation. Task 42 deletes the directory.

## Testing and CI

| Command                | What it runs                                                            | Gate               |
| :--------------------- | :---------------------------------------------------------------------- | :----------------- |
| `bun run test`         | Vitest, 21 files / 190 tests at this checkpoint                         | CI test job        |
| `bun run typecheck`    | `astro check` over `.astro` and `.ts`                                   | CI test job        |
| `bun run lint`         | ESLint flat config, including boundary warnings and the raw-colour rule | CI test job        |
| `bun run format:check` | Prettier over the repo                                                  | CI test job        |
| `bun run test:e2e`     | Playwright Chromium, desktop and mobile projects                        | local and later CI |
| `bun run test:a11y`    | Playwright, `@a11y` tagged tests                                        | local and later CI |
| `bun run build`        | `astro build` into `dist/`                                              | CI build job       |
| `bun run pagefind`     | One index over `dist/` with `--force-language zh-hant`                  | CI build job       |
| `bun run gen:og`       | Regenerates the Open Graph image                                        | manual             |

Playwright specs currently cover design tokens, fonts, prose behavior and the
no-horizontal-overflow matrix
([responsive.spec.ts](../tests/e2e/responsive.spec.ts), helper at
[overflow.ts](../tests/e2e/helpers/overflow.ts)). The a11y script is wired but
no `@a11y` spec exists yet at this checkpoint.

[CI](../.github/workflows/ci.yml) runs test then build then deploy to GitHub
Pages. The separate music pipeline is
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
- React is for interactive or locale-reactive chrome plus the `/music/` island;
  page bodies are Astro/MDX.
- `src/lib/domain` is pure; `src/lib/io` is the I/O edge.
- Blog filenames are the date source; no frontmatter `date` or `slug`.
- Fixed chrome is translated; page content stays zh-hant.
- Pagefind indexes `dist/` once with `--force-language zh-hant`; `/music/` rows
  are excluded.
- `music_asset` is the only source of the music list.
- The footer stamp is committed and rewritten by the pre-commit hook.

## Decision log

### Tailwind v4 plus shadcn as the one styling system

Adopted in the foundation task. Tailwind v4 keeps the theme in CSS
(`@theme`) instead of a JavaScript config, which lets `tokens.css` stay the
single primitive owner. shadcn supplies accessible, vendored primitives without
a second runtime. There is no CSS-in-JS layer, no second component kit and no
`tailwind.config.*`. Rationale: one system to learn, one place for tokens, and
generated components that can be audited and versioned.

### Base UI, not Radix

`base-nova` is the Base UI shadcn base. The interaction contract is `render`,
not `asChild`. Choosing one base avoids mixing two primitive families with
different focus and composition semantics. Test doubles and wrappers assume
`@base-ui/react`. If a future component needs a Radix-only behavior, that is an
architecture decision, not an import.

### One token and radius owner

[tokens.css](../src/styles/tokens.css) owns every raw brand primitive,
including the `--radius-*` and `--text-*` scales.
[global.css](../src/styles/global.css) holds the single semantic `:root` bridge
that maps shadcn names to brand values, plus the `@theme` color and font
mappings. `@theme` must not redeclare a radius scale: Tailwind utilities read
`var(--radius-md)`, and the unlayered `tokens.css` `:root` must win.
[token-guard.test.ts](../src/styles/token-guard.test.ts) enforces the owner and
values. Rationale: the earlier
derived radius scale disagreed with the brand scale, so `rounded-md` and
`var(--radius-md)` rendered different corners.

### Self-hosted static fonts, Latin subsets, system CJK

Sora (display), Inter (body) and JetBrains Mono (meta) are installed as static
Fontsource packages. Only the seven used faces are imported from `latin-*`
entry points, and only Sora 600 plus Inter 400 are preloaded. Chinese copy
falls through to the platform face (`PingFang TC`, `Microsoft JhengHei`,
`Noto Sans TC`), so no CJK webfont is downloaded. Rationale: fewer bytes, no
third-party font host, no render-blocking stylesheet, and a measured CLS far
under budget.

### Tailwind Typography with a brand prose layer

`@plugin "@tailwindcss/typography"` is wired in `global.css`. Article bodies
and the links list use `prose prose-invert prose-brand`. `.prose-brand` is
unlayered so it outranks the plugin's layers without `!important`, fixes the
68ch measure, maps every `--tw-prose-*` variable to a brand token, and restores
CJK rhythm, table scrolling, code and print behavior. Rationale: keep the
plugin's proven defaults, then correct the parts that assume Latin prose.

### Mobile-first breakpoints as policy

Breakpoints are declared once in `global.css`: `2xs` 20rem, `xs` 24rem, `sm`
40rem, `md` 48rem, `lg` 64rem, `xl` 80rem. Layouts are authored at 320 and 390
first, then enhanced with `min-width` variants. The policy lives in
[AGENTS](../AGENTS.md#mobile-first--responsive-design), and the overflow gate
lives in the responsive spec. Rationale: every surface has to be usable on a
phone before it gets a desktop treatment.

### Docs split

README stays the product and usage guide. AGENTS stays the invariant and policy
list. This page covers internals. [Design system](./design-system.md) covers
tokens and UI practice. Rationale: one audience per document, and no copied
prose to drift out of sync.

## Migration watchlist

| Change                                                          | Owner         | Effect on this page                                 |
| :-------------------------------------------------------------- | :------------ | :-------------------------------------------------- |
| `shared/layout`, `shared/typography`, `shared/state` primitives | Tasks 9 to 13 | Replace the layout and typography rows above        |
| Component folder restructure                                    | Task 14       | Replaces the current folder map with the target map |
| `SearchCommand` command palette                                 | Task 18       | Replaces `SearchModal` in the island table          |
| DOM port split and global leak removal                          | Task 38       | Tightens the ports section and the enforcement note |
| Delete `components/mdx/` shims                                  | Task 42       | Removes the shim rows                               |
| AST boundary test                                               | Task 44       | Adds the enforced layer rules                       |
| CI hardening                                                    | Task 50       | Makes the gates in the testing table mandatory      |
| AGENTS rewrite                                                  | Task 51       | Confirms or updates the invariants summary          |

After those tasks land, update this file in the same change. A doc that claims
a future path exists is a bug.
