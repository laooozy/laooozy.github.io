# Release operations

This runbook is the executable path from a verified branch to the live site at
<https://laooozy.github.io>. It covers the one-time GitHub Pages source switch,
the `main` push, verification of the deployed artifact and retirement of the
legacy `gh-pages` branch.

> **Current state (checked 2026-11-02, read-only):** GitHub Pages is still
> configured as `build_type: legacy` with source `gh-pages`, and `origin/main`
> is behind the remediation branch. Nothing in this runbook has been executed
> by CI on the owner's behalf; the cutover requires repository-owner
> credentials and a push to `main`.

## Identifiers

- Repository: `laooozy/laooozy.github.io`
- Live site: <https://laooozy.github.io>
- Deploy workflow: `.github/workflows/ci.yml` (`deploy` job)
- Production artifact: the `dist/` uploaded by the `build` job, not a local
  fixture build

## Prerequisites

- `gh` authenticated as an owner/admin of the repository.
- The release branch is merged, all gates are green and the working tree is
  clean.
- The pre-commit hook is installed (`bun run hooks:install`) so the footer stamp
  is refreshed by the commit, never by a manual edit.

## One-time: switch Pages to GitHub Actions

The repository currently deploys legacy `gh-pages` content. The workflow's
`deploy` job uses `actions/deploy-pages`, which requires the GitHub Actions
source.

Inspect the current settings first:

```sh
gh api repos/laooozy/laooozy.github.io/pages \
  --jq '{build_type, source, status, html_url}'
```

Switch the build type (this is the only mutation in this runbook):

```sh
gh api --method PUT repos/laooozy/laooozy.github.io/pages \
  -f build_type=workflow
```

If Pages is not enabled at all, enable it with the same build type instead:

```sh
gh api --method POST repos/laooozy/laooozy.github.io/pages \
  -f build_type=workflow
```

Verify the switch before pushing:

```sh
gh api repos/laooozy/laooozy.github.io/pages \
  --jq '{build_type, source, status, html_url}'
# expect build_type: "workflow"
```

The workflow already uploads `dist/` with `actions/upload-pages-artifact` and
deploys with `actions/deploy-pages`; do not add a second deploy workflow or a
manual `gh-pages` deploy command.

## Push `main`

Merge the verified release branch fast-forward and push it:

```sh
git switch main
git fetch origin
git merge --ff-only chore/dependency-upgrade-remediation
git push origin main
```

A push to `main` triggers the full workflow. A pull request runs the quality,
build and browser jobs without deploying. The `deploy` job is deliberately
guarded by:

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

Confirm that condition locally before pushing:

```sh
sed -n '/^  deploy:/,/^    steps:/p' .github/workflows/ci.yml
```

The `deploy` job must keep `needs: [build, browser]` and deploy the `build`
job's uploaded Pages artifact. The `build` job already runs `bun run build`
without fixture environment; the browser job's production smoke is additional
coverage and does not replace that artifact.

## Watch CI and the deployment

```sh
gh run list --workflow=ci.yml --branch=main --limit 5
gh run watch <run-id> --exit-status
```

The run must show `build`, `browser` and `deploy` succeeding. A failing
`browser` job in the production smoke step means the real `dist/` is wrong;
fix it instead of skipping the spec.

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

Confirm the deployed HTML is the new build, not fixture data and not the old
`gh-pages` export:

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

## Retire `gh-pages`

Do this **only after** the Actions deployment is live and the checks above pass.
Deleting the branch before the first successful Actions deploy removes the
current live source.

```sh
git push origin --delete gh-pages
git ls-remote --heads origin gh-pages
# expect no output
```

If the repository protected the branch, delete it through the API instead and
record the exception.

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

Without `PLAYWRIGHT_BASE_URL`, the `@production` spec skips with a message
saying how to set it. `bun run test:e2e` excludes both `@visual` and
`@production`; `bun run test:a11y` and `bun run test:visual` never select the
production spec.

## Rollback

If the live artifact is wrong after the switch, redeploy the last known-good
commit through a new `main` push. Do not recreate `gh-pages` as a fallback and
do not revert the Pages source to `legacy`; the workflow is the only deploy
path once the switch is done.
