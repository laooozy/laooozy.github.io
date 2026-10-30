# laooozy

> Photography, games, and a few things I write down.

This is the personal site of **laooozy**, a coser-cum-amateur-photographer with
an ACG (anime / comic / games) persona. It is a fully static
[Astro](https://astro.build) build published to GitHub Pages at
<https://laooozy.github.io>.

There is no CMS and no server. Content lives in the repo as Markdown/MDX, the
site is rendered at build time, and the deployed output is plain HTML/CSS/JS.

## What's here

```
src/
├── adapters/          Ports for storage, locale detection, DOM and search, each with a real adapter and a test double
├── client/            Client-only entry points (bootstrap composition root, locale-boot, scroll-header, atmosphere)
├── components/        Astro and React UI (chrome, MDX page kit, layout primitives, feature components)
├── content/blog/      Blog posts, one Markdown file per post
├── content/links/     The useful-links list, one Markdown file for the whole page
├── content/pages/     Page bodies authored in MDX (home.mdx, acg.mdx)
├── content.config.ts  Zod schemas for the blog, links and pages collections
├── data/              Locale-independent data (Instagram permalinks; the planned now.json ticker)
├── hooks/             Client hooks over the store and its injected adapters
├── i18n/              Fixed-chrome dictionaries and t() (index.ts, ui.ts re-export, types.ts)
├── layouts/           BaseLayout.astro (SEO, nav, footer, pre-paint boot)
├── lib/
│   ├── domain/        Pure post domain: sort, tags, periods, paths, formatting
│   ├── io/            I/O edge: getAllPosts() over astro:content, Instagram oEmbed
│   └── seo.ts         The SITE_INDEXABLE switch
├── pages/             Thin route shells (one URL space: /, /acg/, /links/, /blog/…)
├── store/             The single client store (app-store.ts, types.ts)
└── styles/            Design tokens and global styles
public/                Static assets copied verbatim into the build
scripts/               Build-time helpers (Open Graph image generation)
```

Routes are file-based: `src/pages/**` maps to URLs. Every locale is served from
this one set of routes.

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

| Port               | Real adapter                                                                    | Test double            |
| :----------------- | :------------------------------------------------------------------------------ | :--------------------- |
| `StoragePort`      | `localStorageAdapter` (degrades to memory when storage is blocked)              | `memoryStorageAdapter` |
| `LocaleSourcePort` | `navigatorLocaleSource`                                                         | `fixedLocaleSource`    |
| `DomPort`          | `domAdapter` (scroll, reduced motion, header visibility, the shared frame loop) | `noopDomAdapter`       |
| `PagefindPort`     | `pagefindAdapter` (lazy dynamic import)                                         | `fakePagefind`         |

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

- `client:load` for the header and footer (`SiteHeader`, `SiteFooter`), the 404
  (`NotFound`), the article chrome (`PostArticle`) and the blog listing
  (`BlogList`).
- `client:idle` for the language switcher (`LanguageSwitcher`) and the search
  modal (`SearchModal`).

The home and ACG pages are not islands. Their bodies live in
`src/content/pages/home.mdx` and `src/content/pages/acg.mdx`, and the route
shells (`src/pages/index.astro`, `src/pages/acg.astro`) only load the entry,
render it with `<Content/>` and supply `BaseLayout` plus the `lang="zh-Hant"`
content wrapper. The page kit is described under [Authoring a page](#authoring-a-page).

`PostArticle` (`src/components/PostArticle.tsx`) renders the article chrome
only: the back link, title, date / reading time and tags. The Markdown body
stays Astro-rendered by `render()` with `<Content/>` in
`src/pages/blog/[slug].astro`. Components that need neither a UI library nor
interactivity stay `.astro`.

The links page (`src/pages/links.astro`) follows the same split: its Markdown
list is Astro-rendered, and its heading is emitted in all three locales with the
static `[data-l]` toggle, so it needs no React island and no client state.

The header nav is `About · Blog · ACG · Contact · Useful Links`. Blog points at
the listing index, `/blog/`, not a home anchor, and ACG has its own entry at
`/acg/` rather than being reachable only from the home About grid. Useful Links
is its own page at `/links/`; the project's GitHub repository is the first entry
in that page's list, not a separate external nav link. The home hero carries the
wordmark, tagline, "now" line and a small spec panel. The language control is a
single glassy dropdown button (a globe icon plus the current language) whose
menu lists the three locales; selecting one switches in place, with no URL
change and no reload.

## Authoring a page

Home and ACG are MDX entries, not React pages. To change copy, reorder a
section or add a card, edit `src/content/pages/home.mdx` or
`src/content/pages/acg.mdx`; no React component, route or i18n file changes.
The route shells in `src/pages/` only load the entry, call `render()` and wrap
`<Content/>` in `BaseLayout`.

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

| Component             | Purpose                                                       |
| :-------------------- | :------------------------------------------------------------ |
| `Hero.astro`          | Home masthead: wordmark, tagline, now line, spec panel.       |
| `Section.astro`       | Section shell with heading, lead and optional `actions` slot. |
| `InterestCard.astro`  | One About-grid card with a title and Markdown body.           |
| `Grid.astro`          | Responsive auto-fit grid.                                     |
| `Stack.astro`         | Vertical flow.                                                |
| `Cluster.astro`       | Wrapping row.                                                 |
| `Chips.astro`         | Tag or filter chips.                                          |
| `Cta.astro`           | Link-arrow or ACG accent call to action.                      |
| `ContactRow.astro`    | One contact list row; wrap rows in `Stack as="ul"`.           |
| `LatestPosts.astro`   | Build-time latest-posts grid, or its empty copy.              |
| `AcgMasthead.astro`   | ACG page masthead and intro.                                  |
| `InstagramWall.astro` | Build-time Instagram oEmbed wall with link-out fallbacks.     |

Frontmatter `title` and `description` feed `BaseLayout` and the Open Graph tags.
Omit them only when the `home.title` / `home.tagline` chrome fallback is the
right document metadata.

**Page content stays zh-hant.** The MDX bodies are authored in Traditional
Chinese and are never translated; only the fixed chrome (nav, footer, search,
blog listing, 404, links heading) switches with the locale. Each route wraps the
body in `lang="zh-Hant"`, so screen readers read the Chinese content as Chinese
even when `<html lang>` follows an English chrome choice. Do not add page copy to
`src/i18n` or `src/data`, and do not create per-locale page folders.

Two content surfaces are planned but **not live yet**:

- **Now ticker.** `src/data/now.json` will hold an array of `{ text, href? }`
  items for the hero's "now" line, so the owner can update it without touching
  code. The intended contract: an empty array hides the whole status line, one
  item renders statically, two or more scroll with a pause/play control, and
  reduced motion gets a static wrapped line. Until the ticker lands, the hero
  keeps its `nowText` prop.
- **Instagram gate.** `src/data/instagram.ts` is the single list of post
  permalinks; `InstagramWall.astro` resolves them through Meta's oEmbed endpoint
  at build time and falls back to a link-out card when a post cannot be embedded.
  A click-to-load consent gate is planned so `instagram.com/embed.js` is not
  requested on page load; it is not implemented yet.

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
toggle.

## Requirements

- **Node.js >= 22.22.0** (see `engines` in `package.json`)
- bun

Install dependencies once:

```sh
bun install
```

## Local development

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
  the links heading, and the brand/meta strings. They are authored per locale;
  LLM-assisted translation is permitted as long as each locale reads naturally
  and keeps the same voice (see `PRODUCT.md`), never raw machine output. Shared,
  locale-independent values such as the public contact handles and email live
  there too.
- **Page content is not translated.** The home and ACG bodies stay zh-hant in
  `src/content/pages/*.mdx`. There are no content keys in `src/i18n` and no
  per-locale page folders. Only the chrome follows the locale.
- **Locale-independent assets** live in `src/data/**` (for example the Instagram
  permalinks in `src/data/instagram.ts`). Do not put translated strings there.
- **`<html lang>`** uses BCP-47 casing via `langAttr` (`zh-Hant`, `zh-Hans`,
  `en`), while locale codes stay lowercase. It describes the chrome locale; the
  MDX content wrappers are always `lang="zh-Hant"`.
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
- Instagram (ACG): [acg.laooozy](https://instagram.com/acg.laooozy)
- Email: laooozy@outlook.com
