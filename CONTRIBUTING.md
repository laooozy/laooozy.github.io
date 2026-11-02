# Contributing

Read [AGENTS.md](AGENTS.md) before changing anything. It holds the invariants
and the mobile-first policy. [docs/architecture.md](docs/architecture.md) maps
the code, [docs/decisions.md](docs/decisions.md) records why the boundaries
exist and [docs/release.md](docs/release.md) is the Pages cutover and release
runbook.

## Requirements

- Node.js >= 22.22.0
- [bun](https://bun.sh)
- `yt-dlp` on `PATH` only when working on the music pipeline

## Setup

```sh
bun install
bun run hooks:install
```

`hooks:install` points `core.hooksPath` at `.githooks`. The pre-commit hook
rewrites `src/data/site-updated.json` and stages only that file. Run it once per
clone.

## Development

Start the dev server in background mode:

```sh
bun run astro -- dev --background
bun run astro -- dev status
bun run astro -- dev logs
bun run astro -- dev stop
```

The site is served at <http://localhost:4321>. Use `bun run dev` for a
foreground server.

## Authoring

- **Page copy** lives in `src/content/pages/*.mdx` and is zh-hant only. Edit the
  MDX entry, not a React page component or `src/i18n`.
- **Blog posts** are `src/content/blog/yyyy-mm-dd_<slug>.md`. The filename date
  is the source of truth; there is no `date` or `slug` frontmatter field.
- **Useful links** are the single file `src/content/links/index.md`.
- **Music rows** are generated. Change `scripts/music/` or the workflow, never
  the rendered list.
- **Fixed chrome** is translated in `src/i18n/dictionaries/`. Add a key to all
  three dictionaries and to `FIXED_KEYS` in `src/i18n/parity.test.ts`.

## Quality gate

Run the relevant subset while working and the full set before landing:

```sh
bun run format:check
bun run lint
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

The browser gates need a built artifact. `bun run test:e2e` builds one from
fixture data and serves it; CI reuses `bun run e2e:build`. The build is never the
dev server.

### Production smoke

The fixture gates prove deterministic behavior; the `@production` smoke proves
the artifact that actually ships. It is excluded from `test:e2e`, `test:a11y`
and `test:visual`, and it refuses to run without an external production server:

```sh
bun run build
bun run pagefind

PORT=4323 HOST=127.0.0.1 node scripts/serve-dist.mjs &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

curl --silent --fail --retry 30 --retry-delay 1 --retry-connrefused \
  --output /dev/null http://127.0.0.1:4323/

PLAYWRIGHT_BASE_URL=http://127.0.0.1:4323 bun run test:prod
```

Do not point `test:prod` at the fixture artifact. The full Pages cutover and
post-deploy verification are in [docs/release.md](docs/release.md).

For a visual change, update the committed baseline and review the image diff
before committing:

```sh
bun run test:visual -- --update-snapshots
```

## Commits

Use a conventional subject: `type(scope): summary`, where `type` is one of
`feat`, `fix`, `refactor`, `test`, `docs`, `chore` or `ci`.

Stage the files you changed by name. Never run `git add -A` or `git add .`.
Never use `git commit --only` or a pathspec commit: both bypass the pre-commit
stamp hook and leave the footer date stale. Do not rewrite history on a branch
under review.

## Pull requests

Open a pull request with the repository template. It asks for a summary, the
gates you ran and a note about visual baselines. A pull request runs the three
CI jobs without deploying; only a push to `main` deploys to GitHub Pages.

Before opening one:

- The full quality gate above passes locally.
- New or changed interaction has keyboard and touch coverage, not hover only.
- Every surface was checked at 320, 390, 768, 1024 and 1440 CSS px.
- No locale-prefixed route, per-locale page folder or hosted photo was added.
