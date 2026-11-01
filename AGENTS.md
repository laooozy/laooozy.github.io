# AGENTS

This file is the load-bearing policy for anyone, human or agent, changing the
repository. [PRODUCT.md](PRODUCT.md) holds the product intent and
[docs/architecture.md](docs/architecture.md) holds the detailed map. When this
file and the code disagree, fix the code or this file in the same change.

## Stack and component kit

- **Tailwind v4 plus shadcn base-nova is the one styling system.** The theme
  lives in CSS (`@theme` in `src/styles/global.css`), not in a
  `tailwind.config.*` file. shadcn is generated with `"style": "base-nova"` on
  Base UI (`@base-ui/react`), so composition uses `render`, not `asChild`. Do
  not add Radix, a second UI library, CSS-in-JS or a second colour system.
- **One primitive kit.** Feature-neutral layout, typography, state and
  composition primitives live in `src/components/shared/**`. There are no MDX
  compatibility shims and no second implementation beside the kit. Page content
  imports the shared components directly by relative path.
- **Generated code is read-only.** `src/components/ui/**` is shadcn output. Do
  not hand-edit it for branding; change tokens or compose it in a wrapper
  outside `ui/`. Icons come from `lucide-react`.
- **React is the UI layer for interactive or locale-reactive surfaces** and for
  page primitives that need props, children or hooks. There is no "React only
  for chrome" rule. Page bodies are still authored in MDX and rendered at build
  time, not re-ported to React page components.
- **Feature folders own feature state.** `src/components/shared/**` stays
  presentational: no store, no adapters, no feature hooks. Chrome lives in
  `site/`, blog UI in `blog/`, the playlist in `music/`, Instagram UI in
  `photography/`, and the links list in `links/`.

## Architecture invariants

- **Single URL space.** There is one URL space. The locale is client state, not
  a path segment. Do not add `/en/`, `/zh-hans/` or any locale-prefixed route,
  per-locale page folder or `hreflang` alternate.
- **Client locale and the accepted flash.** `src/client/locale-boot.ts` is an
  inline pre-paint script in `<head>`. It resolves `localStorage`, then
  `navigator`, then falls back to `zh-hant`, and sets `<html lang>` plus
  `data-locale` before first paint. Locale-dependent chrome reads the locale
  from the store through `useT()` and re-renders in place. Because the static
  build emits the default locale, a non-default visitor sees a brief `zh-hant`
  flash before hydration. That is an accepted trade-off, not a bug.
- **Adapters and ports.** Every browser, network and storage effect sits behind
  a port in `src/adapters/**` (`storage`, `locale-source`, `dom`, `pagefind`,
  `music`). Real adapters are wired only in `src/client/bootstrap.ts`.
  Components and hooks receive the injected `ClientDeps`; do not import a real
  adapter or touch `document`, `window`, `navigator` or `localStorage` from a
  component.
- **DomPort is split, one interface.** `src/adapters/dom/**` implements cohesive
  slices: `scroll`, `motion`, `focus`, `locale`, `scripts` and `events`.
  `createDomAdapter` assembles them into the single `DomPort` every consumer
  receives. The `events` slice owns global keydown/pointerdown subscriptions,
  the reversible body scroll lock and the lazy platform probe. Do not add a
  second event system.
- **Atmosphere behind the DOM port.** `src/client/atmosphere.ts` mounts from a
  layout script with `ClientDeps` and draws star dust, shooting stars and
  lightning on one fixed `pointer-events:none` canvas. It uses the SINGLE
  animation loop owned by `DomPort.startLoop`; do not add a second
  `requestAnimationFrame` loop. The entrance reveal is pure CSS under
  `@media (prefers-reduced-motion: no-preference)`; it mounts nothing and draws
  nothing. The nebula wash is a CSS layer on `body::before`.
- **One store.** `src/store/app-store.ts` is the single Zustand vanilla store at
  module scope. Do not add a second state library, a React context store or a
  duplicate locale list or type.
- **Hydration policy.** The exact island inventory is:
  - `client:load`: `SiteHeader`, `SiteFooter`, `ScrollControls`, `NotFound`,
    `PostHeader`, `BlogList`, `MusicLibrary`, and `NowTicker` when
    `src/data/now.json` has items.
  - `client:idle`: `SearchCommand` and `InstagramGate`.
  - `LanguageSwitcher` is `client:load` and is nested inside `SiteHeader`.

  Everything else is static Astro or MDX rendered at build time. `/music/` is
  the one page-level island; its body is the MDX shell in
  `src/content/pages/music.mdx` and its section carries `data-pagefind-ignore`.
  `SearchCommand` is a sibling of the header and lazy-loads its dialog chunk on
  first open. The Instagram gate injects its third-party script only after a
  click, through `DomPort.loadScript`.

- **Pure core.** `src/lib/domain/**` is pure: no `astro:content`, no adapter, no
  DOM. `src/lib/io/**` is the thin build-time I/O edge. Keep that boundary.
- **MDX page content model.** `/`, `/photographer/` and `/music/` are authored
  in `src/content/pages/*.mdx` and rendered at build time by thin route shells
  (`src/pages/index.astro`, `photographer.astro`, `music.astro`). Each route
  loads its entry with `renderPage()` and wraps `<Content/>` in `BaseLayout`
  with `lang="zh-Hant"`. The blog Markdown body stays Astro-rendered by
  `render()` with `<Content/>`. Adding or editing page copy is an MDX edit only:
  do not put page copy in `src/i18n`, `src/data/**` or a React page component.
- **Content versus chrome i18n.** `src/i18n/index.ts` holds fixed chrome only:
  nav, footer, search, blog listing, 404, the links heading, music page labels
  and brand/meta strings. Page content stays zh-hant in the MDX entries and is
  never translated. Only the fixed chrome is trilingual. Each content wrapper is
  marked `lang="zh-Hant"` so assistive technology reads Chinese copy as Chinese
  even when the chrome locale is English.
- **Blog filenames.** Every post in `src/content/blog/` MUST be named
  `yyyy-mm-dd_<slug>.md`. The filename date is the source of truth and there is
  NO frontmatter `date` field: `postDateString(post)` derives it. Treat it as a
  calendar date, never as an instant, and never format it through
  `toISOString()`. The slug is lowercase `a-z`/`0-9` segments joined by single
  hyphens. The public URL comes from `post.id`, so do not add a `slug`
  frontmatter field. `src/lib/io/blog-filenames.test.ts` fails CI on a bad name.
- **Search.** The Pagefind index is built once with `--force-language zh-hant`.
  Do not reintroduce per-`<html lang>` indexing. `/music/` rows are
  client-rendered and excluded with `data-pagefind-ignore`.
- **Music source.** The orphan `music_asset` branch holds the single generated
  payload and is the only source of the list. Do not commit generated playlist
  data to `main` and do not hard-code song rows. The `.github/workflows/music.yml`
  pipeline fails closed: a failed or partial fetch, an empty payload or a blank
  title exits 1 and leaves the branch untouched.
- **Footer stamp.** `src/data/site-updated.json` is committed and rewritten by
  `.githooks/pre-commit`, which stages only that file. Run
  `bun run hooks:install` once per clone. `git commit --only` and pathspec
  commits bypass the hook and are forbidden.
- **Search indexing switch.** `SITE_INDEXABLE` in `src/lib/seo.ts` drives the
  per-page `noindex` meta tag, the sitemap integration and the generated
  `dist/robots.txt` from `src/lib/robots.ts`. The site ships non-indexable by
  default. Flip the one switch to publish; never edit the three surfaces
  separately.
- **Retired routes.** `/acg/` is retired in favor of `/photographer/`. Do not
  add a redirect, legacy guard or per-locale route for it.
- **Identifiers come from the environment.** Copy the brand, owner and
  repository identifier from the authoritative source, never from memory: the
  exact `"name"` in `package.json` and the `site` host in `astro.config.mjs`.
  The music payload URL in `src/lib/site.ts` is derived from that name plus the
  repository remote, never retyped.
- **CI/CD.** `.github/workflows/ci.yml` runs quality, build and browser gates,
  then deploys `main` to GitHub Pages. Do not re-add a manual `gh-pages` deploy
  script or a second deploy workflow.

## Naming conventions

- One concept, one name. Use `locale` (not `lang`) for the active language, and
  `langAttr` for the BCP-47 attribute. Use `post` for a blog entry, `article`
  only for the HTML landmark. Use `organisation` for the music payload grouping
  and `menu` for the header disclosure state.
- Use `t` for a translator already bound to a locale. Use `getTranslations` for
  the build-time dictionary lookup and `useT` for the React hook. Do not add a
  second translation helper or a second locale list.
- Files: React components are `PascalCase.tsx`, Astro components are
  `PascalCase.astro`, hooks are `useX.ts`, and pure modules, adapters and
  utilities are `kebab-case.ts`. Tests are `*.test.ts` or `*.test.tsx` beside
  the module under test. DOM port slices are `src/adapters/dom/<slice>.ts`.
- Code: types and components are `PascalCase`, functions and variables are
  `camelCase`, module constants are `SCREAMING_SNAKE_CASE`. CSS tokens are
  `--kebab-case`; Tailwind utilities are preferred over new bespoke classes.
- Routes are lowercase file names. Import by `@/` alias in TS/TSX and by relative
  path in `.astro`/`.mdx`, matching the existing tree.

## Mobile-first responsive design

- **Design mobile-first.** Author and review every layout at 320 and 390 CSS px
  first, then enhance at wider widths. Breakpoints are declared once in
  `src/styles/global.css` (`@theme`): `2xs` 20rem, `xs` 24rem, `sm` 40rem,
  `md` 48rem, `lg` 64rem and `xl` 80rem. Use `min-width` variants
  (`2xs:`, `xs:`, `sm:`, `md:`, `lg:`, `xl:`). Do not add desktop-first
  `max-width` overrides except the existing compact-header rule in
  `BaseLayout.astro`.
- **No horizontal overflow.** At every tested width
  `document.documentElement.scrollWidth` MUST be less than or equal to
  `clientWidth`. Fix the offending element; never hide it with `overflow-x:
hidden` on `html` or `body`.
- **Touch targets are at least 44x44 CSS px** under `(pointer: coarse)`, even
  when the visible icon is smaller. Generated shadcn Button sizes (28 to 36px)
  need a `min-h-11 min-w-11` wrapper or padding.
- **Inputs are at least 16px.** Form controls compute to a `font-size` of 16px
  or more so mobile Safari does not zoom on focus.
- **Respect safe-area insets.** Fixed or edge-pinned chrome pads with
  `env(safe-area-inset-top|right|bottom|left, 0px)`.
- **No hover-only affordances.** Anything revealed or enabled on `:hover` must
  also be reachable by keyboard focus and touch.
- **Test matrix.** Check every surface at 320, 390, 768, 1024 and 1440 CSS px.
  `tests/e2e/responsive.spec.ts` gates no overflow at 320 and 390, and
  `tests/e2e/responsive-audit.spec.ts` covers the full width matrix, touch
  targets, input sizes and fixed-chrome placement. The wider widths stay a
  manual review matrix for visual judgment.

| Surface          | 320 | 390 | 768 | 1024 | 1440 |
| :--------------- | :-- | :-- | :-- | :--- | :--- |
| `/`              | yes | yes | yes | yes  | yes  |
| `/blog/`         | yes | yes | yes | yes  | yes  |
| `/photographer/` | yes | yes | yes | yes  | yes  |
| `/music/`        | yes | yes | yes | yes  | yes  |
| `/links/`        | yes | yes | yes | yes  | yes  |
| `/404`           | yes | yes | yes | yes  | yes  |

## Quality gate

Run the relevant subset while working and the full set before landing:

```sh
bun run format:check
bun run lint          # eslint . --max-warnings 0
bun run typecheck
bun run test
bun run knip
bun run build
bun run pagefind
bun run test:links
bun run test:e2e
bun run test:a11y
bun run test:visual
bun run size
```

`test:e2e`, `test:a11y` and `test:visual` need a built artifact, which the
Playwright harness builds from fixture data. A visual change also needs its
committed baseline updated with `bun run test:visual -- --update-snapshots` and
the diff reviewed. The full policy is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start the dev server in background mode: `bun run astro -- dev --background`.
Manage it with `bun run astro -- dev status`, `bun run astro -- dev logs` and
`bun run astro -- dev stop`. Full Astro documentation:
<https://docs.astro.build>.
