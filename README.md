# laooozy

Personal site of **laooozy**: photography, games and a few things written down.
Fully static Astro on GitHub Pages (<https://laooozy.github.io>). No CMS, no
server, no database.

## Documentation

| Document                               | What it answers                                              |
| :------------------------------------- | :----------------------------------------------------------- |
| [ARCHITECTURE](docs/architecture.md)   | Layers, ports, data flow, routes and the component tree      |
| [DESIGN SYSTEM](docs/design-system.md) | Tokens, typography, primitives, responsive rules and recipes |
| [DECISIONS](docs/decisions.md)         | Short ADR log for the load-bearing choices                   |
| [CONTRIBUTING](CONTRIBUTING.md)        | Setup, gates, commit and pull-request rules                  |
| [AGENTS](AGENTS.md)                    | Invariants and policy an agent must not break                |
| [PRODUCT](PRODUCT.md)                  | Audience, voice and hard product constraints                 |

## Requirements

- Node.js >= 22.22.0 (see `engines` in `package.json`)
- [bun](https://bun.sh)

## Quickstart

```sh
bun install
bun run hooks:install                # once per clone: points core.hooksPath at .githooks
bun run astro -- dev --background    # dev server at http://localhost:4321
```

Manage the background server:

```sh
bun run astro -- dev status
bun run astro -- dev logs
bun run astro -- dev stop
```

To run the dev server in the foreground, use `bun run dev`.

## Commands

| Command                | What it does                                                      |
| :--------------------- | :---------------------------------------------------------------- |
| `bun run dev`          | Astro dev server with hot reload                                  |
| `bun run build`        | Static build into `dist/`                                         |
| `bun run pagefind`     | Builds the search index from `dist/` (`--force-language zh-hant`) |
| `bun run preview`      | Serves the production build                                       |
| `bun run typecheck`    | `astro check` over `.astro` and `.ts`                             |
| `bun run lint`         | ESLint with `--max-warnings 0`                                    |
| `bun run format:check` | Prettier check                                                    |
| `bun run test`         | Vitest unit and component tests                                   |
| `bun run knip`         | Dead-code and unused-export check                                 |
| `bun run size`         | size-limit bundle budgets                                         |
| `bun run test:links`   | Verifies every internal link in `dist/`                           |
| `bun run test:e2e`     | Playwright journey and chrome tests                               |
| `bun run test:a11y`    | Playwright axe and contrast tests                                 |
| `bun run test:visual`  | Screenshot regression baselines                                   |
| `bun run gen:og`       | Regenerates the Open Graph image                                  |

Always run `bun run build` before `bun run pagefind`: the index is generated
from the rendered HTML in `dist/`.

## Project map

```text
src/
├── adapters/      Browser, network and storage ports plus deterministic doubles
├── client/        Bootstrap composition root, locale boot, atmosphere, scroll header
├── components/    ui/ (generated shadcn), shared/ (the one kit), site/, blog/, music/, photography/
├── content/       blog/*.md, links/index.md, pages/*.mdx
├── hooks/         React bindings over the injected ClientDeps bundle
├── i18n/          Fixed-chrome dictionaries and translation helpers
├── layouts/       BaseLayout.astro and the shared blog listing shell
├── lib/           domain/ (pure), io/ (build-time edge), site identity, SEO
├── pages/         Thin file-based route shells
├── store/         The single Zustand vanilla store
└── styles/        Design tokens and global styles
docs/              Architecture, design system and decisions
scripts/           Build helpers (Open Graph, music pipeline, link check)
tests/e2e/         Playwright journeys, accessibility, visual and responsive gates
```

Routes are file-based under `src/pages/`: `/`, `/blog/` (plus tags, archive and
posts), `/photographer/`, `/music/`, `/links/` and `/404`. All locales share
these URLs; the locale is client state, not a URL segment.

## Content

- **Blog posts** live in `src/content/blog/` and MUST be named
  `yyyy-mm-dd_<slug>.md`. The filename date is the source of truth; there is no
  frontmatter `date` or `slug`. Frontmatter is `title`, `description`, `tags`
  and `draft`. A Vitest guard rejects a bad filename.
- **Page content** is authored in `src/content/pages/home.mdx`,
  `photographer.mdx` and `music.mdx`, then rendered at build time by thin route
  shells. Page copy is zh-hant only; only the fixed chrome is trilingual.
- **Useful links** are one file: `src/content/links/index.md`.
- **Music data** is generated by `scripts/music/fetch.mjs` and published to the
  orphan `music_asset` branch. That branch is the only source of the list; never
  commit generated playlist data to `main`.

The footer stamp in `src/data/site-updated.json` is rewritten by the pre-commit
hook. Do not use `git commit --only` or a pathspec commit; either bypasses the
hook and leaves the stamp stale.

## Deployment

GitHub Actions (`.github/workflows/ci.yml`) runs the quality, build and browser
gates, then deploys `main` to GitHub Pages. A pull request runs the gates
without deploying. There is no manual deploy command.

## Contact

- Instagram: [@laooozy](https://instagram.com/laooozy)
- Photography: [@acg.laooozy](https://instagram.com/acg.laooozy)
- Email: laooozy@outlook.com
