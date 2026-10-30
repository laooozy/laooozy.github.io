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
- **Adapters and ports.** Browser/network/storage effects live behind ports in `src/adapters/**` (storage, locale-source, dom, pagefind). They are wired only in `src/client/bootstrap.ts`. Components receive an injected `ClientDeps`; do NOT import a real adapter from a component.
- **Atmosphere behind the DOM port.** The animated background (`src/client/atmosphere.ts`: star dust, right-to-left shooting stars and purple lightning on one fixed `pointer-events:none` canvas) is a client effect, not a component. It mounts from a layout script with the injected `ClientDeps` and draws on the SINGLE animation loop the DOM port owns (`DomPort.startLoop`); do NOT add a second `requestAnimationFrame` loop, and never import a real adapter or touch a browser global from `src/components/**`. The entrance reveal is not part of the canvas: it is pure CSS (`@media (prefers-reduced-motion: no-preference)`), mounts nothing and draws nothing. The slow nebula wash is a CSS layer (`body::before`), not part of the canvas.
- **One state store.** `src/store/app-store.ts` (Zustand vanilla, module scope) is the single store. Do NOT add a second state library.
- **Hydration policy.** Only fixed chrome is a hydrated React island. `client:load` is used for the chrome (`SiteHeader`, `SiteFooter`), `NotFound`, article chrome (`PostArticle`) and the blog listing (`BlogList`); `client:idle` for the language switcher (`LanguageSwitcher`), the search modal (`SearchModal`) and the Instagram consent gate (`InstagramGate`, whose third-party script injection goes through `DomPort.loadScript`). Page content is NOT an island: `/` and `/acg/` are MDX entries rendered at build time with `<Content/>` by thin route shells (`src/pages/index.astro`, `src/pages/acg.astro`). The Markdown article body stays Astro-rendered by `render()` with `<Content/>` in `src/pages/blog/[slug].astro`. The `/links/` page follows the same split: its one Markdown entry is Astro-rendered, and only the heading uses the static `[data-l]` toggle, so it is not an island.
- **React-for-UI-library rule.** React is reserved for interactive or locale-reactive chrome: header, footer, language switcher, search, blog listing/article chrome and the 404. Page content is Astro/MDX (`src/content/pages/*.mdx` plus `src/components/mdx/*.astro`), not React, and must NOT be re-ported to a React page component. `PostArticle` is `src/components/PostArticle.tsx` (article chrome only); the Markdown body stays Astro-rendered. Purely static components stay `.astro`; do NOT force-port them to React.
- **Pure core.** `src/lib/domain/**` is pure (no `astro:content`, no DOM). `src/lib/io/**` is the thin I/O edge. Keep that boundary.
- **MDX page content model.** `/` and `/acg/` are authored in `src/content/pages/home.mdx` and `src/content/pages/acg.mdx` and rendered at build time by thin route shells. The presentational kit lives in `src/components/mdx/**` (`Hero`, `Section`, `InterestCard`, `Grid`, `Stack`, `Cluster`, `Chips`, `Cta`, `ContactRow`, `LatestPosts`, `AcgMasthead`, `InstagramWall`). Each page imports the components it uses explicitly; there is no global registration and no `set:html` for authored prose. Props carry structure, the default slot carries Markdown. Adding or editing page content is an MDX edit only: do NOT put page copy in `src/i18n`, `src/data/**`, or a React page component, and do NOT add `HomePage`/`AcgPage` back.
- **Content vs chrome i18n.** `src/i18n/index.ts` holds fixed chrome only (nav, footer, search, blog listing, 404, the links heading, brand/meta strings). Page content stays zh-hant in the MDX entries and is never translated. The `<html lang>` attribute tracks the fixed-chrome locale; each MDX content wrapper is marked `lang="zh-Hant"` by its route shell, so assistive technology reads Chinese body copy as Chinese even when the chrome is English. Do NOT add per-locale page folders or translated content keys.
- **Blog filenames.** Every post in `src/content/blog/` MUST be named `yyyy-mm-dd_<slug>.md` (for example `2026-07-09_reasoning-one-book.md`). The date in the filename is the source of truth and there is NO frontmatter `date` field: the post date is derived from the filename id via `postDate(post)` (`src/lib/domain/posts.ts`). It is a calendar date, not an instant: display and period/sort membership use the filename date as-is, so every timezone sees the same day (never derive display from `toISOString()`). `<slug>` is lowercase `a-z`/`0-9` segments joined by single hyphens, and the public URL is derived from `post.id` (the filename without `.md`), so do NOT add a `slug` frontmatter field or change the routing pages. A Vitest guard (`src/lib/io/blog-filenames.test.ts`) parses each filename with the pure `parsePostFilename` (`src/lib/domain/filename.ts`) and fails CI on a bad name.
- **Search.** The Pagefind index is built once with `--force-language zh-hant` (see the `pagefind` script in `package.json`). Do NOT reintroduce per-`<html lang>` indexing.
- **CI/CD.** GitHub Actions (`.github/workflows/ci.yml`) runs test then build then deploy to GitHub Pages. Do NOT re-add a manual `gh-pages` deploy script; `gh-pages` was retired in favor of the workflow.
- **Tests.** Vitest is configured through Astro's `getViteConfig` (`vitest.config.ts`). Run `bun run test` and `bun run typecheck` before landing changes.
- **Identifiers come from the environment.** Every occurrence of the brand, owner or repository identifier, in docs, code, comments or links, MUST be copied from the authoritative source and never retyped from memory: the exact `"name"` value at `package.json:2`, and the host at `astro.config.mjs:11`. Token prediction reliably misspells this identifier (the design file `void-base.html` already contains wrong spellings), so retyping it silently breaks the brand. Read it from the file, for example with `grep -o '"name": *"[^"]*"' package.json`, and paste the value verbatim.
