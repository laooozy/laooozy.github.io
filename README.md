# laooozy

> Photography, games, and a few things I write down.

This is the personal site of **laooozy** — a coser-cum-amateur-photographer, plus
an ACG (anime / comic / games) persona. It is a fully static
[Astro](https://astro.build) build, published to GitHub Pages at
<https://laooozy.github.io>.

There is no CMS and no server: content lives in the repo as Markdown, the site is
rendered at build time, and the deployed output is plain HTML/CSS/JS.

## What's here

```
src/
├── components/        Astro UI components (home, ACG page, blog list, search, …)
├── content/blog/      Blog posts — one Markdown file per post
├── content.config.ts  Zod schema for the blog collection
├── i18n/ui.ts         All UI strings, per locale + shared contact identity
├── layouts/           BaseLayout (SEO, hreflang, nav, footer)
├── lib/               Blog data helpers + locale-URL helpers
├── pages/             Routes (per-locale: /, /en/, /zh-hans/)
└── styles/            Design tokens + global styles
public/                Static assets copied verbatim into the build
scripts/               Build-time helpers (e.g. Open Graph image generation)
```

Routes are file-based: `src/pages/**` maps to URLs, and each locale has its own
folder (`src/pages/en/**`, `src/pages/zh-hans/**`) — the default locale lives at
the root.

## Requirements

- **Node.js >= 22.12.0** (see `engines` in `package.json`)
- bun

Install dependencies once:

```sh
bun install
```

## Local development

Start the dev server in the background (recommended — it keeps your shell free):

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

## Build

Build the production site into `dist/`:

```sh
bun run build            # astro build  ->  dist/
bun run pagefind         # pagefind --site dist   (generates the search index)
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

One command builds, indexes, and publishes to the `gh-pages` branch:

```sh
bun run deploy
```

That is shorthand for:

```sh
bun run build && bun run pagefind && gh-pages -d dist -b gh-pages --dotfiles
```

`gh-pages` pushes the contents of `dist/` to the `gh-pages` branch (including
dotfiles), which GitHub Pages serves at <https://laooozy.github.io>. Changes are
usually live within a minute of the push.

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
| `lang`           | `"zh-hant"` \| `"zh-hans"` \| `"en"` | Which locale this post belongs to.                           |
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
lang: zh-hant
draft: false
translationKey: midnight-notes
---

深夜適合誠實，也適合後悔。
```

Notes:

- **`lang` decides where the post shows up.** A post is listed only under its own
  locale's blog (plus that locale's tag and archive views).
- **`translationKey` links translations.** Give the same `translationKey` to the
  zh-hant / zh-hans / en versions of one post so they stay associated.
- **Set `draft: true`** to keep a work-in-progress out of the build without
  deleting it.
- Posts are listed newest-first (by `date`, title break on ties), paginated
  **4 per page** at build time.

After adding a post, rebuild (`bun run build && bun run pagefind`) or re-run the
dev server, then deploy with `bun run deploy`.

## Internationalization

The site ships in three locales, configured in `astro.config.mjs` and
`src/i18n/ui.ts`:

| Locale    | Name     | URL         | Role     |
| :-------- | :------- | :---------- | :------- |
| `zh-hant` | 繁體中文 | `/` (root)  | Default  |
| `zh-hans` | 简体中文 | `/zh-hans/` | Fallback |
| `en`      | English  | `/en/`      | Fallback |

- **Default locale is `zh-hant`**, served unprefixed at the site root
  (`prefixDefaultLocale: false`).
- **`zh-hans` and `en` fall back to `zh-hant`.** When a page hasn't been
  translated, Astro issues a redirect to the Traditional Chinese page rather
  than a 404 (`fallbackType: 'redirect'`).
- **UI strings** live in `src/i18n/ui.ts`, authored per locale (these are not
  machine translations). Shared, locale-independent values — the public contact
  handles and email — are also defined there.
- **`<html lang>`** uses BCP-47 casing via `langAttr` (`zh-Hant`, `zh-Hans`,
  `en`), while URL locale codes stay lowercase.
- Every page emits **canonical + `hreflang` alternates** for all three locales
  (derived from a locale-neutral path in `src/lib/locale.ts`).

## Contact

- Instagram (personal): [laooozy](https://instagram.com/laooozy)
- Instagram (ACG): [acg.laooozy](https://instagram.com/acg.laooozy)
- Email: laooozy@outlook.com
