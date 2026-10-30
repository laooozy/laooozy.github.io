# MDX page components

Presentational `.astro` components for the Markdown/MDX page layer. They are
thin ports of the React layout primitives and the two page compositions, so an
MDX page can be written as Markdown without changing a single class name,
spacing token, or grid rule. Interactive chrome (header, footer, search,
language switcher) stays a React island and is **not** part of this kit.

## Authoring contract

1. **Import explicitly.** There is no global component registration and no
   component magic. Every page that uses a component names it in its own MDX
   frontmatter/body import:

   ```mdx
   import Hero from "../../components/mdx/Hero.astro";
   import Section from "../../components/mdx/Section.astro";
   import Grid from "../../components/mdx/Grid.astro";
   import InterestCard from "../../components/mdx/InterestCard.astro";
   ```

   A component that is not imported is not available; a typo fails the build.

2. **Markdown stays Markdown.** Components render their body through the
   default `<slot />`. Write normal paragraphs, lists, links and emphasis as
   Markdown children; never pass an HTML string or use `set:html` for authored
   content.

   ```mdx
   <InterestCard id="games" title="Games">
     I play roguelikes and rhythm games.

   - Hades
   - Muse Dash
     </InterestCard>
   ```

3. **Props carry the structure, slots carry the prose.**
   - `Section`: `heading` (renders `<h2>` and wires `aria-labelledby`), `lead`
     (muted supporting paragraph), `id` (anchor), `className`. The body is the
     default slot; an optional `actions` named slot fills the heading row.
   - `InterestCard`: `title` (renders `<h3 class="interest__label">`), `id`
     (card modifier → `interest--<id>`), `className`. The body is the default
     slot.
   - `Hero`: `title`, `tagline`, `nowLabel`, `nowText`, `meta` (array of
     `{ label, value }` rows). The default slot is optional extra masthead
     Markdown.
   - `AcgMasthead`: `handle`, `title`, `label`, `intro` (the larger muted
     lead). The default slot is the remaining intro Markdown.
   - `ContactRow`: `label` and `href`; pass the one-line visible text as
     `value` (or use the default slot). It renders the `<li>`, so wrap rows in
     `<Stack as="ul" gap={3}>`.
   - `LatestPosts`: no props. It reads the blog collection at BUILD time and
     renders the newest posts with the shared `PostCardView` (or the empty
     copy), so it never ships a React island.
   - `Chips`: `items` (`{ label, href?, active? }[]`), `variant` (`"tag"` or
     `"filter"`), `ariaLabel`, `gap`, `className`.
   - `Cta`: `href`, `label` (or a Markdown child), `variant` (`"link"` for the
     quiet `link-arrow` pill, `"acg"` for the accent `acg-cta` pill),
     `external`. Prefer `label` for a one-line control; a Markdown child works
     too and is flattened back to inline.
   - `Grid` / `Stack` / `Cluster`: `gap` (1–12), `as` (any HTML tag),
     plus the primitive's `min`/`columns` (Grid), `align` (Stack/Cluster) and
     `justify` (Cluster).

4. **Page metadata comes from frontmatter.** The `pages` collection accepts
   optional `title` and `description`; the route reads them with `getEntry`
   and passes them to `BaseLayout`. Do not put `<title>` or `<meta>` tags in
   the MDX body.

   ```mdx
   ---
   title: ACG
   description: Cosplay photography and the ACG side of the site.
   ---
   ```

5. **Page shell stays in the route.** The route (`src/pages/*.astro`) owns
   `BaseLayout`, the localized `<div class="home">` / `<div class="acg">`
   wrapper, and build-time data such as the Instagram embeds. The MDX entry
   only composes the page body.

## Components

| Component            | Renders                                                                           | Notes                          |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| `Hero.astro`         | `<header class="hero">` + `hero__main` / `hero__meta`                             | home masthead                  |
| `Section.astro`      | `<section class="section">` + `section__head` / `section__lead` / `section__body` | body + `actions` slots         |
| `InterestCard.astro` | `card interest interest--<id>` + `h3.interest__label` + `Stack`                   | About-grid card                |
| `Grid.astro`         | `.grid` with `--grid-gap` / `--grid-template`                                     | same auto-fit formula as React |
| `Stack.astro`        | `.stack` with `--stack-gap` / `--stack-align`                                     | 1D vertical flow               |
| `Cluster.astro`      | `.cluster` with gap/align/justify custom properties                               | wrapping row                   |
| `Chips.astro`        | `ul.chip-row` + `chip chip--<variant>`                                            | tag or filter chips            |
| `Cta.astro`          | `a.link-arrow` or `a.acg-cta`                                                     | arrow glyph included           |
| `ContactRow.astro`   | `li.contact__item` + `contact__label` / `contact__link`                           | wrap in `Stack as="ul"`        |
| `LatestPosts.astro`  | `.grid` of build-time `post-card` entries, or the empty copy                      | build-time, no hydration       |
| `AcgMasthead.astro`  | `header.acg-masthead` + hero `<h1>` + intro stack                                 | ACG intro                      |

## Example — a section with cards

```mdx
import Section from "../../components/mdx/Section.astro";
import Grid from "../../components/mdx/Grid.astro";
import InterestCard from "../../components/mdx/InterestCard.astro";
import Chips from "../../components/mdx/Chips.astro";

<Section id="about" heading="About" lead="A short intro." className="reveal">
  <Grid min="18rem" gap={5}>
    <InterestCard id="games" title="Games">
      Roguelikes and rhythm games.

      <div class="interest__chips">
        <Chips items={[{ label: "Hades" }, { label: "Muse Dash" }]} />
      </div>
    </InterestCard>

  </Grid>
</Section>
```

## Rules of thumb

- Keep the class names; they are the contract with `src/styles/global.css` and
  `src/styles/pages.css`.
- Do not add scoped page styles to chase a design change — change the shared
  token or primitive instead.
- Empty usage is valid: a `Section` with no heading or an `InterestCard` with
  no children still renders the same wrapper, just empty.
