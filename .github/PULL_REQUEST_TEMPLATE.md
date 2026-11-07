## Summary

<!-- What changed, and why. -->

## Related issue

Closes #

<!-- Link the issue or plan row. Use "Closes #123" to close it on merge.
     Write "None" when there is no issue. -->

## Scope

- [ ] Docs or policy only
- [ ] UI or layout change
- [ ] Content change
- [ ] Build, CI or tooling change

## License

- [ ] I have prior written authorization from laooozy to contribute to this proprietary repository.
- [ ] I have the right to submit this work and it does not copy content I do not own.
- [ ] I understand that no license is granted to me or others and my contribution becomes laooozy's property unless a separate written agreement says otherwise.

## Gates

- [ ] `bun run format:check`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run test:coverage`
- [ ] `bun run knip`
- [ ] `bun run build`
- [ ] `bun run pagefind`
- [ ] `bun run test:links`
- [ ] `bun run test:e2e`
- [ ] `bun run test:a11y`
- [ ] `bun run test:visual`
- [ ] `bun run size`

## Visual evidence

<!-- Attach before and after screenshots for UI changes, at 320 and 1440 CSS
     px. Write "Not a visual change" when nothing renders differently. -->

- [ ] Checked at 320, 390, 768, 1024 and 1440 CSS px
- [ ] No horizontal overflow at 320 and 390
- [ ] Keyboard, focus and touch paths work, not hover only
- [ ] Screenshot baselines updated with `bun run test:visual -- --update-snapshots` and the diff reviewed
- [ ] No baseline change needed

## Security-sensitive changes

- [ ] This change does not touch security-sensitive code.
- [ ] This change touches security-sensitive code and is explained below.

<!-- Security-sensitive means workflows and permissions, third-party scripts,
     user input, external requests, secrets or anything that changes the
     deployed artifact's trust boundary. Do not disclose a live vulnerability
     in a public pull request; follow SECURITY.md. -->

## Invariants

- [ ] Single URL space, no locale-prefixed route or page folder
- [ ] Page content stays zh-hant; only fixed chrome is translated
- [ ] No hosted photos; Instagram stays click-to-load
- [ ] No generated playlist data or hard-coded song rows on `main`
- [ ] No `git add -A`, `git add .`, `git commit --only` or pathspec commit
