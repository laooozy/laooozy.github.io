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
- **Client locale, zero flash.** `src/client/locale-boot.ts` is an inline pre-paint script injected into `<head>`. It resolves `localStorage` then `navigator` then falls back to `zh-hant`, and sets `<html lang>` plus `data-locale` before first paint. Strings for every locale are rendered together through the `<T>` component and toggled by CSS `[data-l]` rules. Do NOT render locale-dependent text in a way that flashes.
- **Adapters and ports.** Browser/network/storage effects live behind ports in `src/adapters/**` (storage, locale-source, dom, pagefind). They are wired only in `src/client/bootstrap.ts`. Components receive an injected `ClientDeps`; do NOT import a real adapter from a component.
- **One state store.** `src/store/app-store.ts` (Zustand vanilla, module scope) is the single store. Do NOT add a second state library.
- **Hydration policy.** Only the language switcher (React island, `client:idle`) and the search modal (vanilla script) ship client JS; everything else is build-time. Do NOT add `client:load`; prefer `client:idle` or `client:visible` only where interactivity is truly needed. The site was migrated FROM an eager-island model, so do NOT reintroduce it.
- **React-for-UI-library rule.** React components are used where a UI library or interactivity is needed. Purely static components may stay `.astro` (for example `PostArticle.astro` uses Astro's `render()` for Markdown). Do NOT force-port static components to React.
- **Pure core.** `src/lib/domain/**` is pure (no `astro:content`, no DOM). `src/lib/io/**` is the thin I/O edge. Keep that boundary.
- **Search.** The Pagefind index is built once with `--force-language zh-hant` (see the `pagefind` script in `package.json`). Do NOT reintroduce per-`<html lang>` indexing.
- **CI/CD.** GitHub Actions (`.github/workflows/ci.yml`) runs test then build then deploy to GitHub Pages. Do NOT re-add a manual `gh-pages` deploy script; `gh-pages` was retired in favor of the workflow.
- **Tests.** Vitest is configured through Astro's `getViteConfig` (`vitest.config.ts`). Run `bun run test` and `bun run typecheck` before landing changes.
