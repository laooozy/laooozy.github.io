# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses semantic versioning for the package version, but the site is
deployed from `main` and does not have tagged releases yet.

## [Unreleased]

### Added

- A proprietary `LICENSE`: all rights reserved; no use or distribution without
  prior written authorization from laooozy.
- `SECURITY.md`, `CODE_OF_CONDUCT.md` and `CHANGELOG.md`.
- GitHub issue templates for bug reports and feature requests.
- A CI badge, live site link, home page preview, links section and license
  section in `README.md`.
- A v8 coverage gate for the pure domain, adapters, store and hooks.
- A computed-style Playwright guard for the now-ticker pause behavior.

### Fixed

- Replaced the expired Instagram post `Dcsnb5YyY0I` with the current
  `DfXLwbryfCU` permalink in the photography wall.

### Changed

- CI now tests the production artifact uploaded by the build job instead of
  rebuilding a second production artifact in the browser job.
- `test:e2e` excludes accessibility tests; `test:a11y` owns that gate.
- `test:prod` fails fast without `PLAYWRIGHT_BASE_URL`; the production smoke
  now treats `/404` as the real 200 route and uses an unknown path for 404.
- Bundle budgets now measure gzip instead of uncompressed output.
- Public route literals are shared through `src/lib/routes.ts`.
- The print theme moved to `src/styles/print.css`; the atmosphere reads the
  brand tokens at runtime instead of duplicating their values.
- The music library uses a discriminated state and memoized derivations; the
  shared `ClientDeps` context boundary is now an enforced allowlist.
- `CONTRIBUTING.md` now covers Playwright browser installation, Linux CJK fonts
  for visual baselines, supported Node and Bun versions, security reporting,
  licensing and branch and pull request expectations.
- `docs/release.md` now describes the current GitHub Actions deployment instead
  of the completed Pages cutover and `gh-pages` retirement.

## [0.0.1]

The current package version. The project did not keep a changelog before this
file; see the git history for earlier changes.
