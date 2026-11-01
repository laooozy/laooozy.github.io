# Decisions

Short architecture decision records. Each entry states the decision, the reason
and the cost. [AGENTS.md](../AGENTS.md) holds the enforceable rules.

## Single URL space with client-side locale

**Status:** accepted.

**Decision.** Every page has one URL. The locale is client state resolved before
first paint from `localStorage`, then `navigator.language`, then `zh-hant`. No
locale-prefixed routes, no per-locale folders, no `hreflang` alternates.

**Why.** A personal site with three chrome locales does not need three copies of
every URL. One URL keeps canonical metadata, the sitemap, internal links and
shared links stable while the visitor changes language in place.

**Cost.** The static build emits `zh-hant` chrome, so a non-default visitor sees
a brief default-locale flash before hydration. Accepted as the trade-off.

## MDX page content with thin route shells

**Status:** accepted.

**Decision.** `/`, `/photographer/` and `/music/` are authored in
`src/content/pages/*.mdx` and rendered at build time. `src/pages/*.astro` only
loads the entry, renders it and supplies `BaseLayout`. The blog Markdown body
stays Astro-rendered. Page copy never moves into React, `src/i18n` or
`src/data`.

**Why.** Copy is content, not UI. MDX lets the owner edit prose and compose
shared primitives without touching routing or translations. The route shells
stay small enough to audit.

**Cost.** Page bodies are not locale-reactive and stay zh-hant. That matches the
product rule that only fixed chrome is translated.

## Tailwind v4 with shadcn base-nova as the one system

**Status:** accepted.

**Decision.** Styling is Tailwind v4 with the theme in CSS (`@theme` in
`src/styles/global.css`). Components start from shadcn base-nova on Base UI,
composed with `render`, not `asChild`. There is no `tailwind.config.*`, no
Radix, no CSS-in-JS and no second UI library.

**Why.** One system to learn, one place for tokens, and generated primitives
that can be versioned and audited. Base UI gives one composition model instead
of mixing two primitive families.

**Cost.** Generated files under `src/components/ui/**` are read-only. Brand
changes happen through tokens or wrappers, never by editing the generated
source.

## One primitive kit in `src/components/shared/**`

**Status:** accepted.

**Decision.** Feature-neutral layout, typography, state and composition
primitives live in one shared kit. There are no MDX compatibility shims and no
second implementation beside it. Page content imports the shared components
directly.

**Why.** A single kit prevents the same grid, stack or heading from drifting
into two versions. It also keeps feature state in feature folders.

**Cost.** `shared/` must stay presentational: no store, no adapters, no feature
hooks. A component that needs feature state belongs in its feature folder.

## Ports and adapters behind one composition root

**Status:** accepted.

**Decision.** Browser, network and storage effects sit behind ports in
`src/adapters/**`. Real adapters are wired only in `src/client/bootstrap.ts`.
Components and hooks receive the injected `ClientDeps`. `DomPort` is one
interface assembled from the `scroll`, `motion`, `focus`, `locale`, `scripts`
and `events` slices.

**Why.** Tests can swap deterministic doubles, and a component cannot smuggle a
browser global past review. One composition root makes the wiring visible.

**Cost.** Every new effect needs a port method and a test double. That is
intentional friction.

## No hosted photos, Instagram click-to-load

**Status:** accepted.

**Decision.** The repository hosts no photo library. Photography is presented
through Instagram link-outs and build-time oEmbed markup. The third-party
`embed.js` is requested only after a visitor clicks the consent gate, through
`DomPort.loadScript`. Photography is not a top-bar navigation item.

**Why.** Hosting photos would add storage, licensing and privacy obligations the
site does not want. Click-to-load keeps a third-party script off the critical
path and out of the no-JS experience.

**Cost.** The Instagram wall depends on Meta's availability. A failed embed
falls back to a local link-out card.

## `music_asset` is the only music source

**Status:** accepted.

**Decision.** The orphan `music_asset` branch holds one generated gzipped
payload. `.github/workflows/music.yml` regenerates it with `yt-dlp` and fails
closed. The client fetches it through `MusicPort` and validates it with
`parseMusicPayload`. Generated playlist data is never committed to `main` and
rows are never hard-coded.

**Why.** Generated data should not pollute the source history, and a failed
fetch must leave the last good payload published.

**Cost.** The page needs the network for its list. The no-JS and fetch-failure
paths fall back to a direct YouTube link.

## Visual and accessibility gates are release gates

**Status:** accepted.

**Decision.** Playwright covers journeys, axe and contrast checks, and committed
screenshot baselines. `responsive-audit.spec.ts` measures the full 320 to 1440
matrix, touch targets, input sizes and fixed chrome. A visual change updates its
baseline in the same change and the diff is reviewed.

**Why.** The site is a visual product. A passing type check cannot prove that a
card edge, a focus ring or a mobile layout still works.

**Cost.** Baselines are pinned to Linux Chromium, DPR 1 and Noto Sans CJK. A
different font package or browser invalidates them.

## One generated robots policy

**Status:** accepted.

**Decision.** `SITE_INDEXABLE` in `src/lib/seo.ts` drives the `noindex` meta
tag, the sitemap integration and `robotsFor()` in `src/lib/robots.ts`.
`src/pages/robots.txt.ts` writes `dist/robots.txt`. There is no static
`public/robots.txt`.

**Why.** A static file can silently contradict the switch. A pure generator is
testable in both states.

**Cost.** The site ships non-indexable by default. Publishing is one deliberate
flip, not three edits.
