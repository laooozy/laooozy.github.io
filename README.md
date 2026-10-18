# laooozy

> Photography, games, and a few things I write down.

This is the personal site of **laooozy**, a coser-cum-amateur-photographer with
an ACG (anime / comic / games) persona. It is a fully static
[Astro](https://astro.build) build published to GitHub Pages at
<https://laooozy.github.io>.

There is no CMS and no server. Content lives in the repo as Markdown, the site is
rendered at build time, and the deployed output is plain HTML/CSS/JS.

## What's here

```
src/
├── adapters/          Ports for storage, locale detection, DOM and search, each with a real adapter and a test double
├── client/            Client-only entry points (bootstrap composition root, locale-boot, scroll-header)
├── components/        Astro and React UI (layout, ui primitives, feature components)
├── content/blog/      Blog posts, one Markdown file per post
├── content.config.ts  Zod schema for the blog collection
├── hooks/             Client hooks over the store and its injected adapters
├── i18n/              Pure dictionaries and t() (index.ts, ui.ts re-export, types.ts)
├── layouts/           BaseLayout.astro (SEO, nav, footer, pre-paint boot)
├── lib/
│   ├── domain/        Pure post domain: sort, tags, periods, paths, formatting
│   ├── io/            I/O edge: getAllPosts() over astro:content
│   └── seo.ts         The SITE_INDEXABLE switch
├── pages/             Routes (one URL space: /, /acg/, /blog/…)
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
changes, those components re-render in place: no navigation, no reload. The
`<T>` component survives only for the language switcher's static screen-reader
a11y label.

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

| Port               | Real adapter                                                       | Test double            |
| :----------------- | :----------------------------------------------------------------- | :--------------------- |
| `StoragePort`      | `localStorageAdapter` (degrades to memory when storage is blocked) | `memoryStorageAdapter` |
| `LocaleSourcePort` | `navigatorLocaleSource`                                            | `fixedLocaleSource`    |
| `DomPort`          | `domAdapter` (scroll, reduced motion, header visibility)           | `noopDomAdapter`       |
| `PagefindPort`     | `pagefindAdapter` (lazy dynamic import)                            | `fakePagefind`         |

Adapters are wired in exactly one place: the composition root
`src/client/bootstrap.ts`, which assembles a `ClientDeps` bundle and seeds the
store from the pre-paint decision. Components and hooks receive that bundle;
none imports an adapter directly, so tests can swap in the doubles above.

## State

There is one client state manager: the module-scope Zustand store in
`src/store/app-store.ts`. It is built with `createStore` from `zustand/vanilla`
rather than the React `create`, so it works outside React (vanilla client code
and event handlers use it directly). It owns the active `locale`, the header
visibility flag, and the search state. The store touches no browser globals;
adapters push values in through its actions.

## Components

React is used where a UI library or interactivity is needed, and any surface
that renders locale-dependent text is a hydrated React island so it can
re-render with the client locale. Hydration is split by surface:

- `client:load` for the chrome (`SiteHeader`, `SiteFooter`), the pages
  (`HomePage`, `AcgPage`, `NotFound`), the article chrome (`PostArticle`) and
  the blog listing (`BlogList`).
- `client:idle` for the language switcher (`LanguageSwitcher`) and the search
  modal (`SearchModal`).

`PostArticle` (`src/components/PostArticle.tsx`) renders the article chrome
only: the back link, title, date / reading time and tags. The Markdown body
stays Astro-rendered by `render()` with `<Content/>` in
`src/pages/blog/[slug].astro`. Components that need neither a UI library nor
interactivity stay `.astro`.

## Search

The Pagefind index is built once against `dist/` with
`--force-language zh-hant`. Search is language-agnostic: the single index answers
queries in every UI locale, so the index language is decoupled from the locale
toggle.

## Requirements

- **Node.js >= 22.12.0** (see `engines` in `package.json`)
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

## Internationalization

The site ships in three locales, all served from the same URLs:

| Locale    | Name     | Notes                                      |
| :-------- | :------- | :----------------------------------------- |
| `zh-hant` | 繁體中文 | Default. Shown when nothing else resolves. |
| `zh-hans` | 简体中文 |                                            |
| `en`      | English  |                                            |

- **UI strings** live in `src/i18n/index.ts` (`ui.ts` is a thin re-export
  barrel). They are authored per locale, not machine translations. Shared,
  locale-independent values such as the public contact handles and email live
  there too.
- **`<html lang>`** uses BCP-47 casing via `langAttr` (`zh-Hant`, `zh-Hans`,
  `en`), while locale codes stay lowercase.
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
