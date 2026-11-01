# PRODUCT

**laooozy** is the personal site of a coser-cum-amateur-photographer who also
writes. Fully static Astro on GitHub Pages; no CMS, no server, no backend.

## Register

**brand**: design _is_ the product. This is a personal identity site, not a
tool. The home page is a masthead: it has to read as a person, not a dashboard.

## Who / where / mood

A coser in Hong Kong, browsing at night on a laptop or phone, lights low. The
site is near-black, lit by a purple aurora, with quiet glass surfaces. It should
feel like stepping into a darkroom: calm, deliberate, a little luminous, never
loud, never busy.

## Users and jobs

1. **A visitor who just met the handle** wants to know who this is and what
   they do in one screen. Job: understand the person fast.
2. **A potential shoot partner (coser or friend)** wants to see the
   photography side and how to reach out. Job: get to `/photographer/` and
   Instagram.
3. **A reader** wants the latest writing. Job: get to a post in one click.

## Principles

- **One screen tells the story.** The fold carries the wordmark, the person, the
  "now" line, and the way in. No dead air.
- **Composed, not decorated.** Depth comes from surface, light and space, not
  from ornament. No gradient text, no stripes, no sketchy SVG. The deep-space
  atmosphere (nebula, star dust, right-to-left shooting stars, purple
  lightning) is sanctioned: it is light and space, not decoration. Under
  `prefers-reduced-motion: reduce` it goes still: no drift, no stars, no
  lightning. The entrance reveal is pure CSS and becomes instant.
- **Static-first.** Content and layout are HTML and CSS. JavaScript is reserved
  for what is genuinely interactive or alive: the scroll-hiding bar, Pagefind
  search, the atmospheric canvas, and the `/music/` playlist and its filters.
  The entrance reveal mounts nothing and runs no script.
- **The kit is the product.** Pages are assembled from one small set of
  composable parts in `src/components/shared/**`, so any layout can be arranged
  freely.

## Voice

Warm, plain, first-person, slightly self-deprecating. **Page content is authored
in Traditional Chinese only and is never translated.** Only the fixed chrome
(nav, footer, search, blog listing, 404, links heading, music labels and brand
strings) ships in three languages. LLM-assisted translation is permitted for
that chrome: a locale may be drafted by a model, but it must read naturally,
keep the same voice, and never ship as raw machine output.

## Hard constraints

- Dark-only. There is no light theme.
- Three chrome locales (`zh-hant` default, `zh-hans`, `en`), all served from one
  URL space. The locale is client state, not a path segment.
- **No hosted photos.** The site links out to Instagram and embeds posts only
  after a click. No image library, no photo upload, no local photo storage.
- **Instagram is click-to-load.** No third-party script is requested on page
  load; the consent gate injects it only after the visitor asks for the posts.
- **Photography is not in the navigation bar.** `/photographer/` is reached from
  the home About grid.
- No real name. The handle only.
