## Summary

<!-- What changed, and why. Link the issue or plan row when there is one. -->

## Scope

- [ ] Docs or policy only
- [ ] UI or layout change
- [ ] Content change
- [ ] Build, CI or tooling change

## Gates

- [ ] `bun run format:check`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run knip`
- [ ] `bun run build`
- [ ] `bun run pagefind`
- [ ] `bun run test:links`
- [ ] `bun run test:e2e`
- [ ] `bun run test:a11y`
- [ ] `bun run test:visual`
- [ ] `bun run size`

## Visual and responsive

- [ ] Checked at 320, 390, 768, 1024 and 1440 CSS px
- [ ] No horizontal overflow at 320 and 390
- [ ] Keyboard, focus and touch paths work, not hover only
- [ ] Screenshot baselines updated with `bun run test:visual -- --update-snapshots` and the diff reviewed
- [ ] No baseline change needed

## Invariants

- [ ] Single URL space, no locale-prefixed route or page folder
- [ ] Page content stays zh-hant; only fixed chrome is translated
- [ ] No hosted photos; Instagram stays click-to-load
- [ ] No generated playlist data or hard-coded song rows on `main`
- [ ] No `git add -A`, `git add .`, `git commit --only` or pathspec commit
