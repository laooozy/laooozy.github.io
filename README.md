# laooozy

> Photography, games, and a few things I write down.

This is the personal site of **laooozy**, a coser-cum-amateur-photographer who
also writes. It is a fully static
[Astro](https://astro.build) build published to GitHub Pages at
<https://laooozy.github.io>.

There is no CMS and no server. Content lives in the repo as Markdown/MDX, the
site is rendered at build time, and the deployed output is plain HTML/CSS/JS.

## What's here

```
src/
├── adapters/          Ports for storage, locale detection, DOM, search and music, each with a real adapter and a test double
├── client/            Client-only entry points (bootstrap composition root, locale-boot, scroll-header, atmosphere)
├── components/        Astro and React UI (chrome, MDX page kit, layout primitives, feature components)
├── content/blog/      Blog posts, one Markdown file per post
├── content/links/     The useful-links list, one Markdown file for the whole page
├── content/pages/     Page bodies authored in MDX (home.mdx, photographer.mdx, music.mdx)
├── content.config.ts  Zod schemas for the blog, links and pages collections
├── data/              Locale-independent data (Instagram permalinks, the now ticker, the footer stamp)
├── hooks/             Client hooks over the store and its injected adapters
├── i18n/              Fixed-chrome dictionaries and t() (index.ts, ui.ts re-export, types.ts)
├── layouts/           BaseLayout.astro (SEO, nav, footer, pre-paint boot)
├── lib/
│   ├── domain/        Pure post domain: sort, tags, periods, paths, formatting
│   ├── io/            I/O edge: getAllPosts() over astro:content, Instagram oEmbed, the footer stamp
│   └── seo.ts         The SITE_INDEXABLE switch
├── pages/             Thin route shells (one URL space: /, /photographer/, /music/, /links/, /blog/…)
├── store/             The single client store (app-store.ts, types.ts)
└── styles/            Design tokens and global styles
public/                Static assets copied verbatim into the build
scripts/               Build-time helpers (Open Graph image generation, the music fetcher)
```

Routes are file-based: `src/pages/**` maps to URLs. The site serves `/`,
`/blog/` (and `/blog/<slug>/`), `/photographer/`, `/links/`, `/music/` and the
404 page. Every locale is served from this one set of routes.

## One URL space, client-side locale

All three locales share the same URLs. There are no per-locale folders and no
locale prefix; the locale is client state, not a path segment.

Resolution order, applied before the first paint by an inline script in `<head>`
(`src/client/locale-boot.ts`):

1. `localStorage["locale"]`, when it holds a supported code.
2. `navigator.language`, matched by prefix (`zh-hans`, `zh-cn` and `zh-sg` map to
   Simplified Chinese, `en` to English).
3. The default, `zh-hant`.

The script sets `<html lang>` and `data-locale` before paint. Locale-dependent
text is rendered by hydrated React components that read the locale from the
Zustand store through `useT(clientDeps)` (`src/hooks/useT.ts`). When the language
changes, those components re-render in place: no navigation, no reload. Page
bodies in `src/content/pages/*.mdx` are outside that mechanism: they stay
zh-hant in every locale. The `<T>` component survives only for the static
all-locale labels on the language switcher and the `/links/` heading.

Because the build is static and single-URL, the server-rendered HTML is always
the default locale (`zh-hant`), and each island renders that default until it
mounts and adopts the store locale. A visitor on a non-default locale therefore
sees a brief `zh-hant` flash before hydration, an accepted trade-off. With
JavaScript disabled, that default is what stays on screen.

Selecting a language writes the new locale to the store, to `<html lang>`, to
`data-locale` and to `localStorage`, all in place. The URL does not change.

## Adapters and ports

Every browser, network and storage effect sits behind a port under
`src/adapters/`. Each port ships a real adapter and a deterministic test double:

| Port               | Real adapter                                                                                      | Test double                    |
| :----------------- | :------------------------------------------------------------------------------------------------ | :----------------------------- |
| `StoragePort`      | `localStorageAdapter` (degrades to memory when storage is blocked)                                | `memoryStorageAdapter`         |
| `LocaleSourcePort` | `navigatorLocaleSource`                                                                           | `fixedLocaleSource`            |
| `DomPort`          | `domAdapter` (scroll, reduced motion, header visibility, the shared frame loop, script injection) | `noopDomAdapter`               |
| `PagefindPort`     | `pagefindAdapter` (lazy dynamic import)                                                           | `fakePagefind`                 |
| `MusicPort`        | `musicAdapter` (gzip/plain sniff, 10 s abort, typed errors)                                       | `fakeMusic` / `fakeMusicError` |

Adapters are wired in exactly one place: the composition root
`src/client/bootstrap.ts`, which assembles a `ClientDeps` bundle and seeds the
store from the pre-paint decision. Components and hooks receive that bundle;
none imports an adapter directly, so tests can swap in the doubles above.

The background atmosphere is one such client: `src/client/atmosphere.ts` mounts
from a layout script with the injected `ClientDeps` and draws on the single
animation loop the DOM port exposes (`DomPort.startLoop`), so the page never runs
a second `requestAnimationFrame` loop. The port, not the client, knows about
`requestAnimationFrame`, `document.hidden` and `prefers-reduced-motion`.

## State

There is one client state manager: the module-scope Zustand store in
`src/store/app-store.ts`. It is built with `createStore` from `zustand/vanilla`
rather than the React `create`, so it works outside React (vanilla client code
and event handlers use it directly). It owns the active `locale`, the header
visibility flag, and the search state. The store touches no browser globals;
adapters push values in through its actions.

## Components

React is used only for interactive or locale-reactive chrome. Everything a page
is made of, including its prose and layout, is Astro/MDX rendered at build time.
Hydration is split by chrome surface:

- `client:load` for the header, footer and scroll controls (`SiteHeader`,
  `SiteFooter`, `ScrollControls`), the 404 (`NotFound`), the article chrome
  (`PostArticle`), the blog listing (`BlogList`) and the `/music/` playlist
  (`MusicLibrary`).
- `client:idle` for the language switcher (`LanguageSwitcher`), the search
  modal (`SearchModal`) and the Instagram consent gate (`InstagramGate`).

`ScrollControls` is the fixed bottom-centre pair of icon buttons: a down arrow
after the page has scrolled and an up arrow back to the top. It reads scroll
state from the injected `DomPort` (`onScroll`, `scrollY`, `distanceFromBottom`)
and calls `scrollToTop` / `scrollToBottom`, so it owns no listener and no
browser global; both buttons start hidden to keep the first client render equal
to the SSR HTML.

The home and photography pages are not islands. Their bodies live in
`src/content/pages/home.mdx` and `src/content/pages/photographer.mdx`, and the
route shells (`src/pages/index.astro`, `src/pages/photographer.astro`) only load
the entry, render it with `<Content/>` and supply `BaseLayout` plus the
`lang="zh-Hant"` content wrapper. The one page-level island is `/music/`: its
body in `src/content/pages/music.mdx` is a heading, `<MusicLibrary client:load />`
and a `<noscript>` link-out, while `src/pages/music.astro` stays a thin shell.
The list section is marked `data-pagefind-ignore`, because its song rows are
client-rendered from the remote payload. The page kit is described under
[Authoring a page](#authoring-a-page).

`PostArticle` (`src/components/blog/PostArticle.tsx`) renders the article chrome
only: the back link, title, date / reading time and tags. The Markdown body
stays Astro-rendered by `render()` with `<Content/>` in
`src/pages/blog/[slug].astro`. Components that need neither a UI library nor
interactivity stay `.astro`.

The links page (`src/pages/links.astro`) follows the same split: its Markdown
list is Astro-rendered, and its heading is emitted in all three locales with the
static `[data-l]` toggle, so it needs no React island and no client state.

The header nav is `About · Blog · Contact · Useful Links`. Blog points at the
listing index, `/blog/`, not a home anchor. Useful Links is its own page at
`/links/`; the project's GitHub repository is the first entry in that page's
list, not a separate external nav link. Photography lives at `/photographer/`
but is not a top-bar item: it is reached from the home About grid. The home hero
carries the wordmark, the "now" line and a small spec panel. The language
control is a single glassy dropdown button (a globe icon plus the current
language) whose menu lists the three locales; selecting one switches in place,
with no URL change and no reload.

## Authoring a page

Home and Photography are MDX entries, not React pages. To change copy, reorder
a section or add a card, edit `src/content/pages/home.mdx` or
`src/content/pages/photographer.mdx`; no React component, route or i18n file
changes. The route shells in `src/pages/` only load the entry, call `render()`
and wrap `<Content/>` in `BaseLayout`.

The presentational kit lives in `src/components/mdx/**`. Each page imports every
component it uses in its own MDX body, then composes it:

```mdx
import Section from "../../components/mdx/Section.astro";
import Grid from "../../components/mdx/Grid.astro";
import InterestCard from "../../components/mdx/InterestCard.astro";

<Section id="about" heading="關於我" lead="A short intro.">
  <Grid min="18rem" gap={5}>
    <InterestCard id="runner" title="跑步的我">
      Write normal Markdown here.
    </InterestCard>
  </Grid>
</Section>
```

There is no global registration and no component magic: a missing import is a
build error. Props carry structure (`heading`, `id`, `title`, `gap`), and the
default slot carries authored Markdown. Do not pass an HTML string through
`set:html`; write Markdown children instead. The full contract, including every
prop, is in `src/components/mdx/README.md`.

| Component                   | Purpose                                                       |
| :-------------------------- | :------------------------------------------------------------ |
| `Hero.astro`                | Home masthead: wordmark, now line, spec panel.                |
| `Section.astro`             | Section shell with heading, lead and optional `actions` slot. |
| `InterestCard.astro`        | One About-grid card with a title and Markdown body.           |
| `Grid.astro`                | Responsive auto-fit grid.                                     |
| `Stack.astro`               | Vertical flow.                                                |
| `Cluster.astro`             | Wrapping row.                                                 |
| `Chips.astro`               | Tag or filter chips.                                          |
| `Cta.astro`                 | Link-arrow or photography accent call to action.              |
| `ContactRow.astro`          | One contact list row; wrap rows in `Stack as="ul"`.           |
| `LatestPosts.astro`         | Build-time latest-posts grid, or its empty copy.              |
| `PhotographyMasthead.astro` | Photography page masthead and intro.                          |
| `InstagramWall.astro`       | Build-time Instagram oEmbed wall, consent gate, link-outs.    |

Frontmatter `title` and `description` feed `BaseLayout` and the Open Graph tags.
Omit them only when the `home.title` chrome fallback is the right document
metadata.

**Page content stays zh-hant.** The MDX bodies are authored in Traditional
Chinese and are never translated; only the fixed chrome (nav, footer, search,
blog listing, 404, links heading, music page labels) switches with the locale.
Each route wraps the body in `lang="zh-Hant"`, so screen readers read the Chinese content as Chinese
even when `<html lang>` follows an English chrome choice. Do not add page copy to
`src/i18n` or `src/data`, and do not create per-locale page folders.

## The "now" ticker

`src/data/now.json` is an array of `{ text, href? }` items for the hero's
"now" line, so the owner can update it without touching code. The contract:
an empty array hides the whole status line, one item renders statically, and
two or more scroll with a 44px pause/play control. It is a build-time read
validated by a Zod schema, so a malformed file fails the build naming the bad
field. The server-rendered base is a static, readable line (no-JS safe) and
`prefers-reduced-motion: reduce` keeps that static wrapped line. The item text
is zh-hant and is never translated; the label and pause/play names are fixed
chrome in `src/i18n`.

**Instagram gate.** `src/data/instagram.ts` is the single list of post
permalinks; `InstagramWall.astro` resolves them through Meta's oEmbed endpoint
at build time and falls back to a link-out card when a post cannot be embedded.
`instagram.com/embed.js` is never requested on page load: the wall shows a
zh-hant "載入 Instagram 貼文" button, and only a click injects the library (once)
through the `DomPort.loadScript` seam. On success the server-rendered
blockquotes are revealed and the link cards are replaced; if the script is
blocked the link cards stay, the gate reports the failure and a local link-out
card is shown. The gate itself is `InstagramGate.tsx` (`client:idle`) and never
touches `document`/`window` directly.

Builds also cap each oEmbed request at 10 s (an abort becomes a link-out card,
never a build failure). For offline local/CI E2E builds only, set
`INSTAGRAM_OEMBED_FIXTURE=1` before `bun run build` to use deterministic fixture
markup with no network request; production builds must leave it unset.

## Atmosphere

The deep-space background has two parts. The slow nebula wash is a CSS layer
(`body::before` in `src/styles/global.css`), fixed and `pointer-events:none`. On
top of it, one fixed, transparent, `pointer-events:none` `<canvas>` paints the
animated part: drifting star dust, occasional right-to-left shooting stars and
purple lightning (an ambient flash plus a pointer-interactive bolt).

That canvas is a client module, `src/client/atmosphere.ts`, not a component. It
mounts from `BaseLayout.astro` with the injected `clientDeps`, exactly like the
scroll header, and it draws on the single animation loop the DOM port owns
(`DomPort.startLoop`): no second `requestAnimationFrame`, paused while the tab is
hidden, and never created under `prefers-reduced-motion: reduce`. Because the
canvas is `pointer-events:none`, clicks pass straight through to the page.

## Search

The Pagefind index is built once against `dist/` with
`--force-language zh-hant`. Search is language-agnostic: the single index answers
queries in every UI locale, so the index language is decoupled from the locale
toggle. The `/music/` rows are client-rendered and their section carries
`data-pagefind-ignore`, so song titles and artist names are not indexed.

## Music

The `/music/` page is the one page-level island. Its data is generated, not
authored: `scripts/music/fetch.mjs` runs `yt-dlp` over the playlist in
`scripts/music/playlist.json`, normalises the dump and writes one gzipped
payload. The adapter (`src/adapters/music.ts`) fetches that payload from the
orphan `music_asset` branch and validates it with `parseMusicPayload`
(`src/lib/domain/music.ts`) before `MusicLibrary` filters it.

Payload shape (`music.json.gz`):

```json
{
  "version": 1,
  "generatedAt": "<ISO timestamp>",
  "playlist": { "id": "<id>", "title": "<title>", "url": "https://…" },
  "organisations": { "<org id>": "<display label>" },
  "songs": [
    {
      "id": "<id>",
      "title": "<title>",
      "artist": "<artist>",
      "artistId": "<artist id>",
      "org": null,
      "thumb": "https://…",
      "url": "https://…"
    }
  ]
}
```

- **Branch.** `music_asset` is an orphan data branch and the only source of the
  list; it holds exactly one file, `music.json.gz`. Generated playlist data is
  never committed to `main`.
- **Workflow.** `.github/workflows/music.yml` runs on a daily cron
  (`17 18 * * *`), on `workflow_dispatch`, and on pushes to `main` that touch
  `scripts/music/**` or the workflow itself. It requests `contents: write`,
  installs the latest unpinned `yt-dlp` release, runs
  `node scripts/music/fetch.mjs`, and force-pushes the payload to
  `music_asset`.
- **Failure.** The pipeline fails closed: a failed fetch (a `yt-dlp` timeout or
  a non-zero/null exit), a partial or incomplete extractor run (no playlist id,
  fewer entries than `playlist_count`, or any `ERROR:` line on stderr even with
  exit 0), an empty payload or a blank title makes the script exit 1. The branch
  is left untouched, so the last good data stays published.
- **Locally.** Run `node scripts/music/fetch.mjs` with `yt-dlp` on your `PATH`.
  `--list-channels` prints the channels and writes nothing; `--playlist <url>`
  exercises a different playlist.

## The footer stamp

The footer's "last updated" line is build-time data, not a runtime clock.
`src/data/site-updated.json` holds `{ "updatedAt": "YYYY-MM-DDTHH:mm" }` in the
owner's local time, and `src/lib/io/site-updated.ts` validates it at import, so
a malformed stamp fails the build with the bad value in the message.

The file is committed and rewritten by `.githooks/pre-commit`, which stages
ONLY that file. Enable it once per clone:

```sh
bun run hooks:install
```

That sets `core.hooksPath` to `.githooks`. Do not use `git commit --only` or a
pathspec commit: both bypass the hook, so the stamp goes stale.

## Requirements

- **Node.js >= 22.22.0** (see `engines` in `package.json`)
- bun

Install dependencies once:

```sh
bun install
```

## Local development

Enable the commit-time footer stamp once per clone:

```sh
bun run hooks:install   # points core.hooksPath at .githooks
```

Start the dev server in the background (recommended, it keeps your shell free):

```sh
astro dev --background
```

Manage that background server with:

```sh
astro dev status   # is it running?
astro dev logs     # tail the server log
astro dev stop     # shut it down
```

The dev server serves the site at <http://localhost:4321> with hot reload. To run
it in the foreground instead, use `bun run dev`.

## Adding a post

Create a Markdown file in `src/content/blog/`. The filename MUST follow the
locked convention `yyyy-mm-dd_<slug>.md`, for example
`src/content/blog/2026-02-14_midnight-notes.md`.

Filename rules:

- The leading `yyyy-mm-dd` is the post date and the **source of truth**. It MUST
  be a real calendar date, so `2026-02-29` is rejected while `2024-02-29` is
  accepted. There is no frontmatter `date` field: the date is derived from the
  filename.
- The date is a **calendar date, not an instant**. The listing, the article
  header, `<time datetime>` and period/sort membership must use the filename
  `YYYY-MM-DD` as-is, so every timezone sees the same day. Never format the date
  through `toISOString()` or a build-local midnight instant; a visitor in New
  York must see the same day as a visitor in Hong Kong.
- The `<slug>` after the underscore must be lowercase `a-z`/`0-9` segments joined
  by single hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`): no uppercase, underscores,
  spaces, slashes, or leading, trailing or doubled hyphens.
- The public URL is derived automatically from the filename (`post.id`), so the
  slug is the URL segment: `2026-02-14_midnight-notes.md` is served at
  `/blog/2026-02-14_midnight-notes/`. There is no `slug` frontmatter field.

A Vitest guard (`src/lib/io/blog-filenames.test.ts`) enforces this over every
file in `src/content/blog/` in CI.

Every post's frontmatter must satisfy the Zod schema in
`src/content.config.ts`:

| Field         | Type       | Notes                                                        |
| :------------ | :--------- | :----------------------------------------------------------- |
| `title`       | `string`   | Post title.                                                  |
| `description` | `string`   | Short summary used in lists and meta tags.                   |
| `tags`        | `string[]` | Defaults to `[]`.                                            |
| `draft`       | `boolean`  | Defaults to `false`. Drafts are excluded from every listing. |

Example:

```md
---
title: 深夜裡的觀察筆記
description: 一些在半夜寫下、隔天醒來常常覺得過於誠實的句子。
tags:
  - 隨筆
draft: false
---

深夜適合誠實，也適合後悔。
```

Notes:

- **Posts are language-agnostic.** Every locale shows the same post set.
- **Set `draft: true`** to keep a work-in-progress out of the build without
  deleting it.
- Posts are listed newest-first (by the date derived from the filename, title
  break on ties), paginated **4 per page** at build time.

After adding a post, rebuild (`bun run build && bun run pagefind`) or restart the
dev server.

## Adding a useful link

The whole `/links/` list lives in ONE Markdown file:
`src/content/links/index.md`. It is not a per-link collection; add, edit or
remove entries by editing that file:

```md
- [Display text](https://example.com) — one short note
```

The visible heading comes from the page and i18n (`links.title`), not from the
Markdown, so the heading switches with the locale while the list stays
language-agnostic. The file's optional frontmatter supports `title` and
`description` (both strings) but neither is required.

After editing the list, rebuild (`bun run build && bun run pagefind`) or restart
the dev server.

## Internationalization

The site ships in three locales, all served from the same URLs:

| Locale    | Name     | Notes                                      |
| :-------- | :------- | :----------------------------------------- |
| `zh-hant` | 繁體中文 | Default. Shown when nothing else resolves. |
| `zh-hans` | 简体中文 |                                            |
| `en`      | English  |                                            |

- **UI strings** live in `src/i18n/index.ts` (`ui.ts` is a thin re-export
  barrel) and cover fixed chrome only: nav, footer, search, blog listing, 404,
  the links heading, the music page labels, and the brand/meta strings. They are
  authored per locale; LLM-assisted translation is permitted as long as each
  locale reads naturally and keeps the same voice (see `PRODUCT.md`), never raw
  machine output. Shared,
  locale-independent values such as the public contact handles and email live
  there too.
- **Page content is not translated.** The home and photography bodies stay
  zh-hant in `src/content/pages/*.mdx`. There are no content keys in `src/i18n`
  and no per-locale page folders. Only the chrome follows the locale.
- **Locale-independent assets** live in `src/data/**` (for example the Instagram
  permalinks in `src/data/instagram.ts`). Do not put translated strings there.
- **`<html lang>`** uses BCP-47 casing via `langAttr` (`zh-Hant`, `zh-Hans`,
  `en`), while locale codes stay lowercase. It describes the chrome locale; the
  MDX and article-body wrappers, post titles and post tags are always
  `lang="zh-Hant"`, and each `<T>` span carries its own locale's `lang`.
- **`document.title` stays build-locale.** The tab title is emitted in the
  default locale (`zh-hant`) and is deliberately not rewritten when the client
  locale changes: the URL is the page's identity, and the canonical/OG metadata
  stays tied to this build. Only `<html lang>` / `data-locale` and the hydrated
  chrome follow the store locale.
- **Locale is client state.** Each page emits one canonical URL and no `hreflang`
  alternates, because there is only one URL per page.

## Testing and type checking

- `bun run test` runs the Vitest suite (`vitest run`), configured through Astro's
  `getViteConfig` in `vitest.config.ts`. The tests cover the pure post domain,
  the i18n core, the adapters against their doubles (including failure paths),
  and the hooks.
- `bun run typecheck` runs `astro check` across the whole project (`.astro` and
  `.ts`).

Both gate CI (see below) and should pass before landing a change.

## Build

Build the production site into `dist/`:

```sh
bun run build            # astro build  ->  dist/
bun run pagefind         # pagefind --site dist --force-language zh-hant
```

`bun run build` renders every page; `bun run pagefind` then indexes the rendered
HTML in `dist/` so the site's client-side search has data. **The search index is
generated against `dist/`, so always run `build` before `pagefind`.**

Preview the production build locally:

```sh
bun run preview
```

To regenerate Open Graph share images:

```sh
bun run gen:og           # node scripts/generate-og.mjs
```

## Deploy

Deployment is automated by **GitHub Actions**. The workflow in
`.github/workflows/ci.yml` runs three jobs:

1. `test`: install from the lockfile, `astro check`, then `vitest run`.
2. `build` (needs `test`): `astro build`, then
   `pagefind --site dist --force-language zh-hant`, then upload `dist/` as the
   GitHub Pages artifact.
3. `deploy` (needs `test` and `build`): `actions/deploy-pages` publishes the
   artifact.

Push to `main` to run the pipeline and publish; open a pull request to run the
`test` gate without deploying. The repository's Pages source is set to
"GitHub Actions". There is no manual deploy command: the old `gh-pages` script
was retired.

## Contact

- Instagram (personal): [laooozy](https://instagram.com/laooozy)
- Instagram (photography): [acg.laooozy](https://instagram.com/acg.laooozy)
- Email: laooozy@outlook.com
