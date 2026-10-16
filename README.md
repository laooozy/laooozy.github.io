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
strings are rendered together by the `<T>` component: one element per locale,
each tagged `data-l="<locale>"`. CSS rules keyed on `html[data-locale]` show
exactly one of them and hide the rest with `display: none`, so hidden locales
leave the accessibility tree. First paint is already correct, which is what
removes the flash, and switching language never navigates or reloads. With
JavaScript disabled, or before the script runs, `zh-hant` is shown.

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

React is used where a UI library or interactivity is needed: the language
switcher, the search modal, the blog filters and pagination, post cards, and the
layout and UI primitives. Components that need neither stay `.astro`. For
example, `PostArticle.astro` renders Markdown with Astro's `render()` and ships
no client JS. The only island that hydrates is the language switcher
(`client:idle`); the search module is loaded lazily on first open. There is no
eager `client:load` island.

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

Create a Markdown file in `src/content/blog/`, e.g.
`src/content/blog/my-new-post.md`. Every post's frontmatter must satisfy the Zod
schema in `src/content.config.ts`:

| Field            | Type                                 | Notes                                                        |
| :--------------- | :----------------------------------- | :----------------------------------------------------------- |
| `title`          | `string`                             | Post title.                                                  |
| `description`    | `string`                             | Short summary used in lists and meta tags.                   |
| `date`           | date (`z.coerce.date()`)             | e.g. `2026-02-14`. Drives ordering and archive grouping.     |
| `tags`           | `string[]`                           | Defaults to `[]`.                                            |
| `lang`           | `"zh-hant"` \| `"zh-hans"` \| `"en"` | Optional and unused for filtering. See the notes below.      |
| `draft`          | `boolean`                            | Defaults to `false`. Drafts are excluded from every listing. |
| `translationKey` | `string`                             | Stable key shared by the same post across locales.           |

Example:

```md
---
title: 深夜裡的觀察筆記
description: 一些在半夜寫下、隔天醒來常常覺得過於誠實的句子。
date: 2026-02-14
tags:
  - 隨筆
draft: false
translationKey: midnight-notes
---

深夜適合誠實，也適合後悔。
```

Notes:

- **Posts are language-agnostic.** Every locale shows the same post set. The
  `lang` field is optional, kept only for provenance, and is never used to
  filter, hide or route a post. A new post does not need to declare it.
- **`translationKey` groups versions of one post.** Give the same
  `translationKey` to the zh-hant, zh-hans and en files of one post so they stay
  associated.
- **Set `draft: true`** to keep a work-in-progress out of the build without
  deleting it.
- Posts are listed newest-first (by `date`, title break on ties), paginated
  **4 per page** at build time.

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
- **The blog `lang` field** is retained in frontmatter but never filters posts.

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
