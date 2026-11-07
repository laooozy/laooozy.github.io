# Release operations

This runbook covers how `main` reaches the live site at
<https://laooozy.github.io>, how to verify a deployment and how to roll back.
There is no manual deploy command.

## Current state

Verified 2026-11-04 from the repository, the read-only Pages API and the live
site:

- GitHub Pages uses `build_type: workflow`. The Pages API can still return the
  old `source` metadata; with the workflow build type, that field does not
  control deployment.
- The `deploy` job in `.github/workflows/ci.yml` deploys `main` after the
  `build` and `browser` jobs pass. Only a push to `refs/heads/main` deploys.
- The remote has no `gh-pages` branch. The legacy branch is retired.
- A pull request runs the quality, build and browser jobs without deploying.
- The most recent `main` run before this check (2026-11-03) completed with the
  `build`, `browser` and `deploy` jobs successful.

This describes the deployment path only. There are no version tags or versioned
releases yet; the package version is `0.0.1` in `package.json`.

## Identifiers

- Repository: `laooozy/laooozy.github.io`
- Live site: <https://laooozy.github.io>
- Deploy workflow: `.github/workflows/ci.yml` (`deploy` job)
- Production artifact: the `dist/` uploaded by the `build` job, not a local
  fixture build

## Prerequisites

- Merge rights on `main`.
- The release branch is merged or ready to merge, all gates are green and the
  working tree is clean.
- The pre-commit hook is installed (`bun run hooks:install`) so the footer stamp
  is refreshed by the commit, never by a manual edit.
- No Pages setting change is part of a normal release. If
  `gh api repos/laooozy/laooozy.github.io/pages --jq '.build_type'` does not
  print `workflow`, stop and ask the repository owner to repair the setting in
  GitHub Pages settings. Do not create a `gh-pages` branch.

## Deploy `main`

Merge the verified branch and push it:

```sh
git switch main
git fetch origin
git merge --ff-only <release-branch>
git push origin main
```

A push to `main` triggers the full workflow. The `deploy` job is guarded by:

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

It keeps `needs: [build, browser]` and deploys the Pages artifact uploaded by
the `build` job. The `build` job runs `bun run build` without fixture
environment and uploads `dist/` as `production-dist`; the `browser` job
downloads that artifact and runs the production smoke against it through
`DIST_DIR`. The browser job does not rebuild a second production artifact.

Do not add a second deploy workflow, a `gh-pages` push step or a manual deploy
script.

## Watch CI and the deployment

```sh
gh run list --workflow=ci.yml --branch=main --limit 5
gh run watch <run-id> --exit-status
```

The run must show `build`, `browser` and `deploy` succeeding. A failing
`browser` job in the production smoke step means the real `dist/` is wrong; fix
it instead of skipping the spec.

## Verify `origin/main` parity

On `main` after the push:

```sh
git fetch origin
git rev-list --left-right --count origin/main...HEAD
# expect: 0	0
```

## Verify the live artifact

Check the Pages API and the live response:

```sh
gh api repos/laooozy/laooozy.github.io/pages \
  --jq '{build_type, source, status, html_url}'

curl -sSI https://laooozy.github.io/ | grep -Ei 'HTTP/|content-type|last-modified'
```

The API must show `build_type: "workflow"`. Treat the `source` field as legacy
metadata when the build type is `workflow`.

Confirm the deployed HTML is the new build, not fixture data and not an old
export:

```sh
# Must print nothing: no fixture environment markers or fixture stamp.
! curl -fsS https://laooozy.github.io/ |
  grep -E 'SITE_UPDATED_FIXTURE|INSTAGRAM_OEMBED_FIXTURE|2026-01-01T00:00'

# The footer stamp should be a real commit stamp, not the fixture value.
curl -fsS https://laooozy.github.io/ | grep -oE 'datetime="[^"]+"' | head

# Confirm the hashed build assets are served from the same deployment.
curl -fsS https://laooozy.github.io/ | grep -oE '/_astro/[^"]+' | sort -u | head
```

Fetch one asset from the list above and require HTTP 200. While
`SITE_INDEXABLE` is `false` in `src/lib/seo.ts`, the live site intentionally
serves `robots.txt` with `Disallow: /` and pages with `noindex, nofollow`.
Flip that one switch only when the site is ready to be indexed.

## Local production smoke

The production smoke is separate from the fixture browser gates. It requires a
real build with no fixture environment and a server on a dedicated port:

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

`bun run test:prod` refuses to start without `PLAYWRIGHT_BASE_URL`; it never
builds a fixture artifact or exits successfully with every test skipped. If you
run the spec directly, it still skips without a base URL. `bun run test:e2e`
excludes `@visual`, `@a11y` and `@production`; `bun run test:a11y` and
`bun run test:visual` never select the production spec.

## Rollback

If the live artifact is wrong after a deployment, redeploy the last known-good
commit through a new `main` push. Do not recreate `gh-pages` as a fallback and
do not switch Pages back to the legacy source; the workflow is the only deploy
path.

## Retired procedures

The one-time cutover from legacy `gh-pages` to GitHub Actions and the deletion
of `gh-pages` are complete. They were verified on 2026-11-04 and are not part of
a release. Do not run the old `gh api --method PUT ... -f build_type=workflow`
command, do not recreate `gh-pages` and do not add a manual deploy step. If the
Pages setting ever regresses, the repository owner repairs it once in the
GitHub Pages settings; the release process stays push-to-`main`.
