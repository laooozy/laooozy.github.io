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
- **Client locale, accepted brief flash.** `src/client/locale-boot.ts` is an inline pre-paint script injected into `<head>`. It resolves `localStorage` then `navigator` then falls back to `zh-hant`, and sets `<html lang>` plus `data-locale` before first paint. Locale-dependent text is rendered by hydrated React components that read the locale from the store through `useT(clientDeps)` (`src/hooks/useT.ts`) and re-render in place when it changes; the `<T>` all-locale component survives only for the language switcher's screen-reader a11y label. Because the static build emits the default locale (`zh-hant`) and each island renders that default until it mounts, a non-default visitor sees a brief `zh-hant` flash before hydration. That is an accepted trade-off, not a bug.
- **Adapters and ports.** Browser/network/storage effects live behind ports in `src/adapters/**` (storage, locale-source, dom, pagefind). They are wired only in `src/client/bootstrap.ts`. Components receive an injected `ClientDeps`; do NOT import a real adapter from a component.
- **One state store.** `src/store/app-store.ts` (Zustand vanilla, module scope) is the single store. Do NOT add a second state library.
- **Hydration policy.** Locale-reactive surfaces are hydrated React islands. `client:load` is used for the chrome (`SiteHeader`, `SiteFooter`), pages (`HomePage`, `AcgPage`, `NotFound`), article chrome (`PostArticle`) and the blog listing (`BlogList`); `client:idle` for the language switcher (`LanguageSwitcher`) and the search modal (`SearchModal`). The Markdown article body stays Astro-rendered by `render()` with `<Content/>` in `src/pages/blog/[slug].astro`.
- **React-for-UI-library rule.** React components are used where a UI library or interactivity is needed, including any surface that renders locale-dependent text so it can re-render from the store. `PostArticle` is now `src/components/PostArticle.tsx` (article chrome only); the Markdown body stays Astro-rendered. Purely static components may stay `.astro`; do NOT force-port them to React.
- **Pure core.** `src/lib/domain/**` is pure (no `astro:content`, no DOM). `src/lib/io/**` is the thin I/O edge. Keep that boundary.
- **Search.** The Pagefind index is built once with `--force-language zh-hant` (see the `pagefind` script in `package.json`). Do NOT reintroduce per-`<html lang>` indexing.
- **CI/CD.** GitHub Actions (`.github/workflows/ci.yml`) runs test then build then deploy to GitHub Pages. Do NOT re-add a manual `gh-pages` deploy script; `gh-pages` was retired in favor of the workflow.
- **Tests.** Vitest is configured through Astro's `getViteConfig` (`vitest.config.ts`). Run `bun run test` and `bun run typecheck` before landing changes.
