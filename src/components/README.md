# Component folders

`src/components/` is split by ownership, not by framework. A component only
lives at the root of the tree when it is temporary; new components belong in one
of the folders below.

| Folder                          | Owns                                                                                                                                                                                                                    | Framework                                                                     |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| [`ui/`](./ui)                   | Generated shadcn base-nova primitives only.                                                                                                                                                                             | React (generated; do not hand-edit)                                           |
| [`site/`](./site)               | Site chrome: `SiteHeader`, `SiteFooter`, `ScrollControls`, `LanguageSwitcher`, `SearchCommand`, `NotFound`, `T`, `NowTickerClient`, plus the thin Astro wrappers `Hero.astro` and `NowTicker.astro`.                    | React islands; `.astro` only where a `client:*` directive or slot requires it |
| [`blog/`](./blog)               | Everything blog: `BlogList`, `BlogFilters`, `BlogPagination`, `BlogEmpty`, `BlogEmptyView`, `PostCard`, `PostCardView`, `PostHeader`, plus the build-time `LatestPosts.astro`.                                          | React islands + pure views; `LatestPosts.astro` is build-time Astro           |
| [`music/`](./music)             | `MusicLibrary`, the `/music/` playlist island.                                                                                                                                                                          | React                                                                         |
| [`photography/`](./photography) | `InstagramGate` and the build-time `InstagramWall.astro`.                                                                                                                                                               | React island + build-time Astro                                               |
| [`shared/`](./shared)           | The one feature-neutral kit: `layout/`, `typography/`, `state/`, `compositions/`, `ChipRow`, `Section`, `InterestCard`, `PhotographyMasthead`, `Cta`, `ContactRow`, `HeroView`, `HeroMeta` and the shared prop `types`. | React, no store or adapters                                                   |

## Rules

- **`ui/` is generated.** Never hand-edit a file there for a brand change; use
  tokens or a wrapper outside `ui/`.
- **One kit.** `shared/` is the only presentational primitive kit. There are no
  MDX compatibility shims and no second implementation beside it. Page content
  imports the shared components directly.
- **No feature logic in `shared/`.** The shared kit stays presentational: no
  feature hooks, no store and no adapters. The one boundary exception is
  `shared/ClientDepsContext.tsx`: it is the single component-side importer of
  the composition root (`@/client/bootstrap`) and exposes the injected
  `ClientDeps` bundle through `useClientDeps()`. Every other component reads the
  bundle through that hook. Feature state belongs in the owning folder.
  `src/architecture.test.ts` enforces the allowlist, so a new
  `shared/ → client/bootstrap` import fails CI.
- **Thin Astro wrappers stay thin.** `site/Hero.astro`, `site/NowTicker.astro`,
  `blog/LatestPosts.astro` and `photography/InstagramWall.astro` exist because
  Astro owns build-time I/O (`await`) and `client:*` directives. Their bodies
  are React components from `shared/` or the owning feature folder.
- **Import by alias in TS/TSX** (`@/components/...`) and by relative path in
  `.astro`/`.mdx` files, matching the existing tree. No component imports a real
  adapter; browser/network effects stay behind the ports.
- **One store, one locale path.** Components read locale through the hooks and
  never add a second state library.
