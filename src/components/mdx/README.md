# MDX page components

The paths in this directory are **compatibility shims** for the Markdown/MDX
page layer. Each one forwards to its real implementation elsewhere in
`src/components/`:

- `Hero`, `Section`, `InterestCard`, `PhotographyMasthead`, `Cta` and
  `ContactRow` are React/Tailwind compositions in `src/components/shared/`.
- `Grid`, `Stack`, `Cluster` and `Chips` wrap the shared layout/ChipRow
  primitives.
- `LatestPosts` is the build-time wrapper in `src/components/blog/`, and
  `InstagramWall` is the build-time wrapper in `src/components/photography/`.
  Both stay Astro because they need top-level `await`; `Hero`/`NowTicker` stay
  Astro because the "now" island needs a `client:load` directive.

The shims exist only until Tasks 25/27 migrate `home.mdx` and
`photographer.mdx` to the new components; Task 42 deletes this directory.
Interactive chrome (header, footer, search, language switcher) stays a React
island and is **not** part of this kit.

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
     (muted supporting paragraph), `id` (anchor), `className`, `hidden`. The
     body is the default slot; an optional `actions` named slot fills the
     heading row.
   - `InterestCard`: `title` (renders `<h3 class="interest__label">`), `id`
     (card modifier → `interest--<id>`), `className`, `hidden`. The body is the
     default slot.

   `hidden` accepts `true` or `"empty"`. `hidden` (the boolean) always renders
   nothing for that section/card. `hidden="empty"` renders nothing while the
   default slot produces no content, and renders the section/card normally as
   soon as real Markdown children are present. Use it to keep an unfinished
   section out of the public page without deleting the placeholder copy: leave
   the placeholder as an MDX comment inside the call, and replace that comment
   with the real body when the owner supplies it.
   - `Hero`: `title`, `tagline`, `meta` (array of `{ label, value }` rows).
     The "now" status line is rendered by `NowTicker.astro` from
     `src/data/now.json`; there are no `nowLabel`/`nowText` props. The default
     slot is optional extra masthead Markdown.
   - `PhotographyMasthead`: `title` (renders the hero `<h1>`), `intro` (the
     larger muted lead; the shared component calls it `lead`), `className`.
     There are no `handle` or `label` props. It renders the shared
     `PhotographyMasthead` with the `photo-masthead` class hook; the rest of the
     intro is the default slot.
   - `ContactRow`: `label` and `href`; pass the one-line visible text as
     `value` (or use the default slot). It renders the `<li>`, so wrap rows in
     `<Stack as="ul" gap={3}>`.
   - `LatestPosts`: no props. It reads the blog collection at BUILD time and
     renders the newest posts with the shared `PostCardView` (or the empty
     copy), so it never ships a React island.
   - `Chips`: `items` (`{ label, href?, active? }[]`), `variant` (`"tag"` or
     `"filter"`), `ariaLabel`, `gap`, `className`.
   - `Cta`: `href`, `label` (or a Markdown child), `variant` (`"link"` for the
     quiet pill, `"photo"` for the accent pill), `external`. Prefer `label` for
     a one-line control; a Markdown child works too and is flattened back to
     inline.
   - `Grid` / `Stack` / `Cluster`: `gap` (1–12), `as` (any HTML tag),
     plus the primitive's `min`/`columns` (Grid), `align` (Stack/Cluster) and
     `justify` (Cluster).

4. **Page metadata comes from frontmatter.** The `pages` collection accepts
   optional `title` and `description`; the route reads them with `getEntry`
   and passes them to `BaseLayout`. Do not put `<title>` or `<meta>` tags in
   the MDX body.

   ```mdx
   ---
   title: 攝影
   description: 一個突然喜歡拍照的純興趣驅動的新手。
   ---
   ```

5. **Page shell stays in the route.** The route (`src/pages/*.astro`) owns
   `BaseLayout`, the page wrapper (`.home` / `.photography` / `.music-page`)
   and build-time data such as the Instagram embeds. The MDX entry only
   composes the page body.

## Components

| Component                   | Implementation                                                                     | Notes                      |
| --------------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| `Hero.astro`                | `src/components/site/Hero.astro` (React `HeroView`/`HeroMeta` + build-time ticker) | home masthead              |
| `Section.astro`             | `src/components/shared/Section.tsx`                                                | body + `actions` slot shim |
| `InterestCard.astro`        | `src/components/shared/InterestCard.tsx`                                           | About-grid card            |
| `Grid.astro`                | `src/components/shared/layout/Grid.tsx`                                            | auto-fit layout primitive  |
| `Stack.astro`               | `src/components/shared/layout/Stack.tsx`                                           | 1D vertical flow           |
| `Cluster.astro`             | `src/components/shared/layout/Cluster.tsx`                                         | wrapping row               |
| `Chips.astro`               | `src/components/shared/ChipRow.tsx` (shadcn Badge/Button)                          | static, no hydration       |
| `Cta.astro`                 | `src/components/shared/Cta.tsx`                                                    | arrow glyph included       |
| `ContactRow.astro`          | `src/components/shared/ContactRow.tsx`                                             | wrap in `Stack as="ul"`    |
| `LatestPosts.astro`         | `src/components/blog/LatestPosts.astro`                                            | build-time, no hydration   |
| `PhotographyMasthead.astro` | `src/components/shared/PhotographyMasthead.tsx`                                    | photography intro          |

## Hiding unfinished content

Never ship placeholder copy. When a section or card has no real copy yet, keep
the placeholder in an MDX comment and mark the component `hidden="empty"`:

```mdx
{/_
Placeholder awaiting the owner's copy (was: 內容待補).
Replace this comment with real Markdown and the card appears on rebuild.
_/}

<InterestCard id="runner" title="Runner" hidden="empty"></InterestCard>
```

`hidden="empty"` renders no `<section>`/card, no heading and no empty rule or
gap while the body is empty; adding real Markdown children makes it appear on
the next build. For a fixed, permanent hide use `hidden` (boolean). This is a
presentation gate only — the placeholder copy stays in the MDX, ready to be
replaced, and no final copy is invented in the component or the i18n files.

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
- Empty usage is valid by default: a `Section` with no heading or an
  `InterestCard` with no children still renders the same wrapper, just empty.
  Add `hidden="empty"` when that empty wrapper should not be emitted at all
  (the unfinished-placeholder case above).
