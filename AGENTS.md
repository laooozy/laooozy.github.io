## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Architecture invariants

These are load-bearing. Preserve them unless a change explicitly targets the architecture.

- **Single URL space.** There is a single URL space: no `/en/` or `/zh-hans/` folders or routes. The locale is client state, not a path segment. Do NOT add locale-prefixed routes or per-locale page folders.
- **Client locale, accepted brief flash.** `src/client/locale-boot.ts` is an inline pre-paint script injected into `<head>`. It resolves `localStorage` then `navigator` then falls back to `zh-hant`, and sets `<html lang>` plus `data-locale` before first paint. Locale-dependent text is rendered by hydrated React components that read the locale from the store through `useT(clientDeps)` (`src/hooks/useT.ts`) and re-render in place when it changes; the `<T>` all-locale component is used only for the language switcher's screen-reader a11y label and the static `/links/` heading, both pure CSS `[data-l]` toggles. Because the static build emits the default locale (`zh-hant`) and each island renders that default until it mounts, a non-default visitor sees a brief `zh-hant` flash before hydration. That is an accepted trade-off, not a bug.
- **Adapters and ports.** Browser/network/storage effects live behind ports in `src/adapters/**` (storage, locale-source, dom, pagefind, music). They are wired only in `src/client/bootstrap.ts`. Components receive an injected `ClientDeps`; do NOT import a real adapter from a component.
- **Atmosphere behind the DOM port.** The animated background (`src/client/atmosphere.ts`: star dust, right-to-left shooting stars and purple lightning on one fixed `pointer-events:none` canvas) is a client effect, not a component. It mounts from a layout script with the injected `ClientDeps` and draws on the SINGLE animation loop the DOM port owns (`DomPort.startLoop`); do NOT add a second `requestAnimationFrame` loop, and never import a real adapter or touch a browser global from `src/components/**`. The entrance reveal is not part of the canvas: it is pure CSS (`@media (prefers-reduced-motion: no-preference)`), mounts nothing and draws nothing. The slow nebula wash is a CSS layer (`body::before`), not part of the canvas.
- **One state store.** `src/store/app-store.ts` (Zustand vanilla, module scope) is the single store. Do NOT add a second state library.
- **Hydration policy.** Only fixed chrome is a hydrated React island, with one deliberate page-level exception. `client:load` is used for the chrome (`SiteHeader`, `SiteFooter`, `ScrollControls`), `NotFound`, article chrome (`PostArticle`), the blog listing (`BlogList`) and the `/music/` playlist (`MusicLibrary`); `client:idle` for the language switcher (`LanguageSwitcher`), the search modal (`SearchModal`) and the Instagram consent gate (`InstagramGate`, whose third-party script injection goes through `DomPort.loadScript`). `/music/` is the explicit exception: its body is a thin MDX shell (`src/content/pages/music.mdx`) around `MusicLibrary`, and that island's section is `data-pagefind-ignore` so its client-rendered rows never reach the search index. Every other page content is NOT an island: `/` and `/photographer/` are MDX entries rendered at build time with `<Content/>` by thin route shells (`src/pages/index.astro`, `src/pages/photographer.astro`). The Markdown article body stays Astro-rendered by `render()` with `<Content/>` in `src/pages/blog/[slug].astro`. The `/links/` page follows the same split: its one Markdown entry is Astro-rendered, and only the heading uses the static `[data-l]` toggle, so it is not an island.
- **React-for-UI-library rule.** React is reserved for interactive or locale-reactive chrome: header, footer, scroll controls, language switcher, search, blog listing/article chrome and the 404, plus the one page-level island, the `/music/` playlist (`MusicLibrary`). Page content is Astro/MDX (`src/content/pages/*.mdx` plus `src/components/mdx/*.astro`), not React, and must NOT be re-ported to a React page component. `PostArticle` is `src/components/PostArticle.tsx` (article chrome only); the Markdown body stays Astro-rendered. Purely static components stay `.astro`; do NOT force-port them to React.
- **Pure core.** `src/lib/domain/**` is pure (no `astro:content`, no DOM). `src/lib/io/**` is the thin I/O edge. Keep that boundary.
- **MDX page content model.** `/` and `/photographer/` are authored in `src/content/pages/home.mdx` and `src/content/pages/photographer.mdx` and rendered at build time by thin route shells. `/music/` is authored in `src/content/pages/music.mdx`; its body is a heading, the `MusicLibrary` island and a `<noscript>` fallback, so the route shell (`src/pages/music.astro`) stays thin. The presentational kit lives in `src/components/mdx/**` (`Hero`, `Section`, `InterestCard`, `Grid`, `Stack`, `Cluster`, `Chips`, `Cta`, `ContactRow`, `LatestPosts`, `PhotographyMasthead`, `InstagramWall`). Each page imports the components it uses explicitly; there is no global registration and no `set:html` for authored prose. Props carry structure, the default slot carries Markdown. Adding or editing page content is an MDX edit only: do NOT put page copy in `src/i18n`, `src/data/**`, or a React page component, and do NOT add `HomePage`/`PhotographyPage` back.
- **Content vs chrome i18n.** `src/i18n/index.ts` holds fixed chrome only (nav, footer, search, blog listing, 404, the links heading, music page labels, brand/meta strings). Page content stays zh-hant in the MDX entries and is never translated. The `<html lang>` attribute tracks the fixed-chrome locale; each MDX content wrapper is marked `lang="zh-Hant"` by its route shell, so assistive technology reads Chinese body copy as Chinese even when the chrome is English. Do NOT add per-locale page folders or translated content keys.
- **Blog filenames.** Every post in `src/content/blog/` MUST be named `yyyy-mm-dd_<slug>.md` (for example `2026-07-09_reasoning-one-book.md`). The date in the filename is the source of truth and there is NO frontmatter `date` field: the post date is derived from the filename id via `postDateString(post)` (`src/lib/domain/posts.ts`). It is a calendar date, not an instant: display and period/sort membership use the filename date as-is, so every timezone sees the same day (never derive display from `toISOString()`). `<slug>` is lowercase `a-z`/`0-9` segments joined by single hyphens, and the public URL is derived from `post.id` (the filename without `.md`), so do NOT add a `slug` frontmatter field or change the routing pages. A Vitest guard (`src/lib/io/blog-filenames.test.ts`) parses each filename with the pure `parsePostFilename` (`src/lib/domain/filename.ts`) and fails CI on a bad name.
- **Search.** The Pagefind index is built once with `--force-language zh-hant` (see the `pagefind` script in `package.json`). Do NOT reintroduce per-`<html lang>` indexing. The `/music/` rows are client-rendered and their section carries `data-pagefind-ignore`, so song titles and artist names are not indexed.
- **CI/CD.** GitHub Actions (`.github/workflows/ci.yml`) runs test then build then deploy to GitHub Pages. Do NOT re-add a manual `gh-pages` deploy script; `gh-pages` was retired in favor of the workflow. `.github/workflows/music.yml` is the separate data pipeline: a daily cron (`17 18 * * *`), `workflow_dispatch`, and pushes to `main` touching `scripts/music/**` or the workflow itself. It requests `contents: write`, installs the latest unpinned `yt-dlp`, runs `node scripts/music/fetch.mjs`, and force-pushes one gzipped payload to the orphan `music_asset` branch. Failure contract: a failed fetch (including a `yt-dlp` timeout or non-zero/null exit), a partial or incomplete extractor run (a missing playlist id, fewer entries than `playlist_count`, or any `ERROR:` line on stderr even when the exit status is 0), an empty payload or a blank title exits 1, leaves the branch untouched, and the last good data stays published.
- **Tests.** Vitest is configured through Astro's `getViteConfig` (`vitest.config.ts`). Run `bun run test` and `bun run typecheck` before landing changes.
- **Identifiers come from the environment.** Every occurrence of the brand, owner or repository identifier, in docs, code, comments or links, MUST be copied from the authoritative source and never retyped from memory: the exact `"name"` value at `package.json:2`, and the host at `astro.config.mjs:11`. Token prediction reliably misspells this identifier (the design file `void-base.html` already contains wrong spellings), so retyping it silently breaks the brand. Read it from the file, for example with `grep -o '"name": *"[^"]*"' package.json`, and paste the value verbatim. The music adapter's raw-data URL (`MUSIC_URL` in `src/adapters/music.ts`) is composed from that `package.json:2` name plus the repository remote in `.git/config` (`laooozy/laoozy.github.io`), never retyped from memory.
- **The old `/acg/` address is retired.** That page was deleted in favor of `/photographer/`; do NOT add a redirect, a legacy-route guard, or a per-locale route for it.
- **The footer stamp is committed.** `src/data/site-updated.json` holds `{ "updatedAt": "YYYY-MM-DDTHH:mm" }`, rewritten by `.githooks/pre-commit` and staged by that hook alone; `src/lib/io/site-updated.ts` validates it at import so a malformed stamp fails the build. Run `bun run hooks:install` ONCE per clone to point `core.hooksPath` at `.githooks`. `git commit --only` / `--pathspec` bypasses the hook, so the stamp goes stale, and is forbidden.
- **`music_asset` is the only source of the music list.** The `/music/` page reads the payload from the orphan `music_asset` branch at runtime through the injected `MusicPort` (validated by `parseMusicPayload` in `src/lib/domain/music.ts`); do NOT commit generated playlist data to `main`, and do NOT hard-code song rows in a component.
- **`void-base.html` is an unshipped design artifact.** It is untracked and never deployed, and its brand strings contain misspellings of the identifier. Do not copy any identifier or link from it, do not commit it, and do not delete it without the owner.

> **Migration note (architecture refactor).** The in-flight plan at
> `.omo/plans/architecture-artwork-refactor.md` supersedes the temporal guidance in
> **Hydration policy** and **React-for-UI-library rule** above until Task 51 rewrites this
> file. The plan moves shared layout, typography and form primitives into
> `src/components/shared/**` as React, replaces the MDX `Grid`/`Stack`/`Cluster` twins with
> compatibility shims, and retires the "static components stay `.astro`" split wherever the
> new primitives apply. Follow the plan's tasks, not the stale split. The PRODUCT invariants
> do NOT move: one URL space, client-side locale, the MDX page-content model, no Photography
> in the nav, no hosted photos, and Instagram stays click-to-load.

## Mobile-first / responsive design

These rules are load-bearing for every surface, alongside the architecture invariants above.
Task 51 may reorganize this file; this section stays the source of truth for responsive work.

- **Design mobile-first.** Author and review every layout at 320 and 390 CSS px wide first,
  then add enhancement at wider widths. The breakpoints are declared once in
  `src/styles/global.css` (`@theme`): `2xs` 20rem (320px), `xs` 24rem (384px), `sm` 40rem
  (640px), `md` 48rem (768px), `lg` 64rem (1024px) and `xl` 80rem (1280px). Use `min-width`
  variants (`2xs:`, `xs:`, `sm:`, `md:`, `lg:`, `xl:`); do NOT add desktop-first `max-width`
  overrides except the existing compact-header rule in `BaseLayout.astro`.
- **No horizontal overflow.** At every tested width `document.documentElement.scrollWidth`
  MUST be less than or equal to `document.documentElement.clientWidth`. Fix the offending
  element; never silence it with `overflow-x: hidden` on `html`/`body`.
- **Touch targets are at least 44x44.** Every interactive control must offer a hit area of at
  least 44 by 44 CSS px under `(pointer: coarse)`, even when the visible icon is smaller
  (for example `min-h-11 min-w-11` on the wrapper). The generated shadcn Button sizes
  (28-36px) are too small on their own.
- **Inputs are at least 16px.** Form controls compute to a `font-size` of at least 16px, so
  mobile Safari does not zoom the viewport on focus.
- **Respect safe-area insets.** Fixed or edge-pinned chrome pads with
  `env(safe-area-inset-top|right|bottom|left, 0px)`; never assume a zero inset.
- **No hover-only affordances.** Anything revealed or enabled on `:hover` must also be
  reachable by keyboard focus and touch. Content and actions must never depend on hover.
- **Test matrix.** Check every surface at 320, 390, 768, 1024 and 1440 CSS px wide. The
  automated no-overflow gate is `tests/e2e/responsive.spec.ts`, which uses the
  `expectNoHorizontalOverflow` helper from `tests/e2e/helpers/` at 320x800 and 390x844 on the
  routes below; the wider widths stay a manual review matrix until Task 42 extends it.

| Surface          | 320 | 390 | 768 | 1024 | 1440 |
| :--------------- | :-- | :-- | :-- | :--- | :--- |
| `/`              | yes | yes | yes | yes  | yes  |
| `/blog/`         | yes | yes | yes | yes  | yes  |
| `/photographer/` | yes | yes | yes | yes  | yes  |
| `/music/`        | yes | yes | yes | yes  | yes  |
| `/links/`        | yes | yes | yes | yes  | yes  |
| `/404`           | yes | yes | yes | yes  | yes  |
