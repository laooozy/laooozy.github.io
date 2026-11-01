# Design system

This page is the working map of the visual system: tokens, typography,
primitives, utilities, responsive rules and the recipes a contributor follows.
It describes what is in the repo today.

Related reading:

- [Architecture](./architecture.md) for layers, ports and component ownership.
- [AGENTS](../AGENTS.md#mobile-first-responsive-design) for the load-bearing
  responsive policy.
- [README](../README.md) for quickstart and content authoring.
- [Decisions](./decisions.md) for why the system is shaped this way.

## Token architecture

The system is dark-only. There is no light theme and no second colour system.
Values flow in one direction:

```text
src/styles/tokens.css        raw brand primitives, unlayered :root
        |
src/styles/global.css        single semantic :root bridge (shadcn names)
        |
@theme inline                colour and font names exposed to Tailwind
@theme                       breakpoints and animation entries
        |
Tailwind utilities + brand @utility rules + prose-brand
```

### `tokens.css` owns the primitives

[tokens.css](../src/styles/tokens.css) declares every raw value: the near-black
base, the purple accent, glass surfaces, text tones, type scale, spacing,
radius, layout, motion and the z-index scale. It is imported first by
[global.css](../src/styles/global.css).

Two ownership rules are load-bearing:

- `--radius-*` (6, 10, 14, 16 and 999px) is declared only here. `@theme` must
  not declare a derived radius scale. Tailwind's `rounded-md` reads
  `var(--radius-md)`, and the unlayered `:root` in `tokens.css` wins over the
  theme layer, so brand and utility agree.
- `--text-*` is also declared only here. The unlayered values beat Tailwind's
  theme defaults, so `text-3xl` resolves to the brand value, not the framework
  default.

[token-guard.test.ts](../src/styles/token-guard.test.ts) asserts the owner and
the values. [BaseLayout.astro](../src/layouts/BaseLayout.astro) reads
`--bg-base` from this file at build time to emit `theme-color`, so the browser
bar cannot drift from the page canvas.

### `global.css` bridges shadcn names

[global.css](../src/styles/global.css) is the one CSS entry. It imports
`tokens.css`, `atmosphere.css`, the seven Fontsource faces, Tailwind,
`tw-animate-css`, `shadcn/tailwind.css`, and wires the Typography plugin. It
then contains:

1. A `@theme inline` block that maps shadcn colour names (`--color-background`,
   `--color-primary`, and so on) to the semantic variables, plus
   `--font-heading` and `--font-sans`.
2. A single `:root` bridge that points shadcn's semantic names at brand tokens:
   `--background` is `--bg-base`, `--primary` is the brand accent, `--border`
   is the glass border, and so on.
3. A `@theme` block with the mobile-first breakpoints and the animation
   entries.

There is no `.dark` duplicate token block. The site is dark-only, so one
semantic `:root` is enough. `<html class="dark">` stays because Tailwind's
`dark:` variant is defined through `@custom-variant dark`, but it does not
switch a second palette.

### Colour rules

- Use the tokens. Do not write raw hex, `rgb()` or `oklch()` values in
  component classes. The custom ESLint rule in
  [eslint.config.js](../eslint.config.js) rejects arbitrary brand colours such
  as `bg-[#7c3aed]`.
- Brand purple is `--accent`. shadcn's `--accent` means a hover surface, so the
  bridge maps shadcn's name to `--accent-surface` and keeps the purple on
  `--primary`. This split exists because the two names collided and every
  `hover:bg-accent` once painted solid purple.
- Body text on the accent uses `--accent-text`, the lifted, text-safe tone.
  `--accent` itself is for fills, icons and display punctuation, not body copy.
- `--control-border` and `--control-border-strong` are solid tones for control
  boundaries. `--glass-border` is decorative and too faint for a control edge.
- Print re-points the tokens to paper-safe values near the bottom of
  `global.css`. That is a print override, not a light theme.

## Typography

### Families

| Role                 | Family         | Weights loaded |
| :------------------- | :------------- | :------------- |
| Display and headings | Sora           | 600, 700       |
| Body and chrome      | Inter          | 400, 500, 600  |
| Dates, code, meta    | JetBrains Mono | 400            |

The three faces are installed as static Fontsource packages and imported from
their `latin-*` entry points in `global.css`. Latin-only subsets avoid shipping
cyrillic, greek and vietnamese files the site never renders. No Google Fonts
request is made. Two critical faces (Sora 600 and Inter 400) are preloaded from
hashed Vite URLs in `BaseLayout`, with `as="font"`, `type="font/woff2"` and
`crossorigin`.

Chinese text falls through to the platform's own Traditional Chinese face:
`PingFang TC`, then `Microsoft JhengHei`, then `Noto Sans TC`, then the generic
sans stack. No CJK webfont is downloaded. The computed stack is defined in
`--font-display`, `--font-body` and `--font-mono` in `tokens.css`.

Do not add a new family or a new weight without a measured need. The seven
faces above are the whole budget.

### Prose

Tailwind Typography is wired with `@plugin "@tailwindcss/typography"` in
`global.css`. Without that directive the `prose` classes do not exist.

Article bodies and the links list use `prose prose-invert prose-brand`.
`.prose-brand` is intentionally unlayered so it outranks the plugin's layers
without `!important`. It:

- caps the measure at `var(--measure)` (68ch);
- maps every `--tw-prose-*` variable to a brand token;
- restores CJK line breaking, line height and hanging punctuation;
- turns a Markdown table into its own horizontal scroll container at
  `width: max-content; max-width: 100%; overflow-x: auto`;
- restores code, blockquote, image and figure styles;
- switches tables to `display: table` and removes the measure under
  `@media print`, so paper has no scrollbar.

The post body stays Astro-rendered. `Prose` in
[typography/Prose.tsx](../src/components/shared/typography/Prose.tsx) is for
React contexts only; do not move the Markdown body into React to style it.

## Breakpoints and responsive design

Breakpoints are declared once in the `@theme` block of `global.css`:

| Token | Width          | Typical use           |
| :---- | :------------- | :-------------------- |
| `2xs` | 20rem / 320px  | Smallest tested phone |
| `xs`  | 24rem / 384px  | Large phone           |
| `sm`  | 40rem / 640px  | Small tablet          |
| `md`  | 48rem / 768px  | Tablet                |
| `lg`  | 64rem / 1024px | Desktop               |
| `xl`  | 80rem / 1280px | Wide desktop          |

Use `min-width` variants (`2xs:`, `xs:`, `sm:`, `md:`, `lg:`, `xl:`). Author
and review at 320 and 390 first, then enhance upward. The only desktop-first
`max-width` rule is the compact-header switch: `@media (max-width: 621px)` in
[tokens.css](../src/styles/tokens.css) moves `--header-height`, mirrored by
`max-[621px]:` utilities in
[LanguageSwitcher.tsx](../src/components/site/LanguageSwitcher.tsx). Do not add
another.

### Test matrix

| Surface          | 320 | 390 | 768 | 1024 | 1440 |
| :--------------- | :-- | :-- | :-- | :--- | :--- |
| `/`              | yes | yes | yes | yes  | yes  |
| `/blog/`         | yes | yes | yes | yes  | yes  |
| `/photographer/` | yes | yes | yes | yes  | yes  |
| `/music/`        | yes | yes | yes | yes  | yes  |
| `/links/`        | yes | yes | yes | yes  | yes  |
| `/404`           | yes | yes | yes | yes  | yes  |

The automated gates:

- [responsive.spec.ts](../tests/e2e/responsive.spec.ts) asserts no horizontal
  overflow on every route at 320x800 and 390x844.
- [responsive-audit.spec.ts](../tests/e2e/responsive-audit.spec.ts) covers the
  full width matrix, touch targets, input sizes, fixed-chrome placement and the
  page-chrome gap.

The wider widths stay a manual review matrix for visual judgment.

### Responsive rules

- No horizontal overflow. At every tested width
  `document.documentElement.scrollWidth` must be less than or equal to
  `clientWidth`. Fix the offending element. Never silence it with
  `overflow-x: hidden` on `html` or `body`.
- Touch targets are at least 44 by 44 CSS px under `(pointer: coarse)`. The
  generated shadcn Button sizes are only 28 to 36px tall, so wrap or pad them
  (`min-h-11 min-w-11`) when they are real touch controls.
- Inputs compute to at least 16px, so mobile Safari does not zoom on focus.
- Fixed or edge-pinned chrome pads with
  `env(safe-area-inset-top|right|bottom|left, 0px)`.
- No hover-only affordances. Anything revealed on hover must also work on
  keyboard focus and touch.
- The header may shrink, but the content order must not depend on a wide
  viewport.

## Primitives

`components.json` uses `"style": "base-nova"`, the Base UI flavor of shadcn.
The peer is `@base-ui/react`; the composition prop is `render`, not `asChild`.
The icon set is `lucide-react`.

### Generated shadcn primitives

[src/components/ui](../src/components/ui) is generated output. Do not hand-edit
it for a brand change. The set covers:

| Group      | Exports                                                                                                                                                                                                                                      |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions    | `Button`, `buttonVariants`, `Toggle`, `ToggleGroup`, `ToggleGroupItem`                                                                                                                                                                       |
| Surfaces   | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`, `Item`, `ItemGroup`, `ItemSeparator`, `ItemTitle`, `ItemDescription`                                                                        |
| Status     | `Badge`, `badgeVariants`, `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`, `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`                                                                   |
| Forms      | `Input`, `InputGroup`, `Textarea`, `Label`, `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup`                                                                                                                                     |
| Overlays   | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `DropdownMenu` and its parts, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `Collapsible` |
| Search     | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`                                                                                              |
| Navigation | `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`, `PaginationEllipsis`                                                                                                          |
| Utility    | `Separator`, `Skeleton`, `Spinner`, `ScrollArea`, `ScrollBar`, `Kbd`, `KbdGroup`                                                                                                                                                             |

### The shared kit

[src/components/shared](../src/components/shared) is the one feature-neutral
kit. It stays presentational: no store, no adapters, no feature hooks.

| Folder          | Contents                                                                                                 |
| :-------------- | :------------------------------------------------------------------------------------------------------- |
| `layout/`       | `Stack`, `Cluster`, `Grid`, `Container`, the static class maps and `useLayoutElement`                    |
| `typography/`   | `Heading`, `Text`, `Prose`, the `cva` variants                                                           |
| `state/`        | `EmptyState`, `AlertState`, `SkeletonState`, `SpinnerState`, `TooltipState`, `Kbd`                       |
| `compositions/` | `ChipRow`, `ContactRow`, `Cta`, `InterestCard`, `Section`, `HeroView`, `HeroMeta`, `PhotographyMasthead` |

There are no MDX compatibility shims and no second implementation beside the
kit. Page content imports these components directly.

### Working with generated primitives

- Do not hand-edit a generated file for a brand change. Change the token or the
  variant call site instead.
- Do not add a second UI library or a Radix package. `base-nova` is the one
  base.
- Use `render` for composition:
  `DialogPrimitive.Close render={<Button />}`.
- Keep the focus ring. The generated components carry
  `focus-visible:border-ring focus-visible:ring-ring/50`; do not override it
  with `outline-none` alone.
- Import from the lower-case file path, matching the generated tree.

## Utilities, CVA and `cn`

`cn` is the `cn` package. Generated files import it directly; application code
may import the re-export from [src/lib/utils.ts](../src/lib/utils.ts). It merges
conflicting Tailwind classes, which is why a caller's `className` can override a
default without `!important`.

`class-variance-authority` (`cva`) is the variant mechanism. Generated
primitives use it, and brand components should too instead of a pile of
conditional class strings. Prettier is configured with
`tailwindFunctions: ["cn", "cva"]`, so classes inside both calls are sorted.

The brand utilities are declared with `@utility` in `global.css`:

| Utility            | Effect                                                                                                              |
| :----------------- | :------------------------------------------------------------------------------------------------------------------ |
| `glass`            | Translucent card: `--surface`, `--card-bg`, `--glass-border`, `--glass-glow`, `backdrop-filter: blur(--glass-blur)` |
| `surface`          | Opaque elevated surface: `--bg-elevated`, `--glass-border`, `--card-inset`                                          |
| `card-surface`     | The card recipe: `--surface` plus `--card-bg`, glass border, inset highlight, mobile-first padding, blur            |
| `card-interactive` | Hover/focus lift and border for a card that is itself a link; lift is disabled under reduced motion                 |
| `card-grid`        | The `data-count` card row: one column, two from `sm`, exact 1/2/3/4 tracks from `xl`                                |
| `embed-frame`      | Third-party Instagram frame: dark loading skeleton (`::after`) and `!important` oEmbed/iframe overrides             |
| `measure`          | `max-width: var(--measure)` plus `text-wrap: pretty`                                                                |
| `cjk-label`        | `word-break: keep-all` and `overflow-wrap: anywhere` for short CJK labels; never on long prose                      |
| `focus-ring`       | The 2px accent outline with a 3px offset                                                                            |

`glass` and `surface` are alternatives, not layers. Do not stack both.
`card-surface` and `card-interactive` compose (surface first), and
`embed-frame` is only for the third-party oEmbed block whose inline styles the
site cannot reach.

### Component recipe

Follow this for a new brand component. Do not edit `src/components/ui/**`, and
do not import an adapter or touch a browser global.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

const noticeVariants = cva("rounded-lg border p-4 text-sm", {
  variants: {
    tone: {
      default: "border-border bg-card text-card-foreground",
      brand: "border-primary/40 bg-primary/10 text-foreground",
    },
  },
  defaultVariants: { tone: "default" },
});

type NoticeProps = ComponentProps<"div"> & VariantProps<typeof noticeVariants>;

export function Notice({ className, tone, ...props }: NoticeProps) {
  return <div className={cn(noticeVariants({ tone }), className)} {...props} />;
}
```

Use it from another component or an island:

```tsx
import { Notice } from "@/components/shared/Notice";

export function Example() {
  return (
    <Notice tone="brand" role="note">
      Copy comes from the caller, not from this component.
    </Notice>
  );
}
```

Rules for the recipe:

1. Prefer an existing generated primitive. Compose `Button`, `Card`, `Badge`
   and friends before writing new markup.
2. Put variants in `cva`, not in nested ternaries.
3. Accept `className` and merge it last with `cn`.
4. Use token utilities (`bg-card`, `border-border`, `text-muted-foreground`,
   `rounded-lg`, `min-h-11`). Do not write raw colours.
5. Keep copy out of the component when it is fixed chrome. Take a string prop or
   let the caller pass children; render chrome labels through
   `useHydrationSafeT`.
6. If the component is interactive, give it a real touch target and a visible
   focus style. Do not add `onMouseEnter`-only behavior.
7. Verify with `bun run typecheck`, `bun run lint` and `bun run build`.

## Recipes

### Add a page

1. Create the body as an MDX entry in `src/content/pages/<slug>.mdx`. Frontmatter
   `title` and `description` are optional strings; the page collection schema is
   in [content.config.ts](../src/content.config.ts).
2. Extend `PageId` in [src/lib/io/pages.ts](../src/lib/io/pages.ts) so
   `renderPage()` accepts the new id.
3. Import every shared component the body uses. There is no global
   registration, so a missing import fails the build:

   ```mdx
   import Section from "../../components/shared/Section";
   import Grid from "../../components/shared/layout/Grid";
   import InterestCard from "../../components/shared/InterestCard";

   <Section id="about" heading="關於我" lead="A short intro.">
     <Grid min="18rem" gap={5}>
       <InterestCard id="runner" title="跑步的我">
         Normal Markdown goes here.
       </InterestCard>
     </Grid>
   </Section>
   ```

4. Add a thin route shell in `src/pages/<slug>.astro`:

   ```astro
   ---
   import BaseLayout from "../layouts/BaseLayout.astro";
   import { renderPage } from "../lib/io/pages";

   const { entry, Content } = await renderPage("notes");
   ---

   <BaseLayout title={entry.data.title} description={entry.data.description}>
     <div class="notes-page" lang="zh-Hant">
       <Content />
     </div>
   </BaseLayout>
   ```

   The `lang="zh-Hant"` wrapper is required: page content stays zh-hant even
   when the chrome locale is English.

5. If the page belongs in the top nav, add it to the nav list in
   [SiteHeader.tsx](../src/components/site/SiteHeader.tsx), add the same key to
   all three dictionaries in [i18n/index.ts](../src/i18n/index.ts), and add it
   to `FIXED_KEYS` in [parity.test.ts](../src/i18n/parity.test.ts). Do not add a
   locale prefix or a second route. Photography is not a nav item.

6. Run `bun run typecheck && bun run build`.

### Add a component

1. Decide where it belongs: `shared/` for a feature-neutral primitive, a
   feature folder (`site/`, `blog/`, `music/`, `photography/`, `links/`) for
   surface-specific UI, `ui/` only for generated shadcn.
2. Write the component with the [component recipe](#component-recipe). Use
   `cva`, `cn`, tokens and the generated primitives.
3. Import it where it renders. If it must be interactive or locale-reactive,
   mount it from a React island and read `ClientDeps` through `useClientDeps()`;
   if it only needs data, pass plain serializable props.
4. Run `bun run typecheck`, `bun run lint`, `bun run build`.
5. If the component is temporary, delete it and its import in the same change.
   Do not leave a probe behind.

### Add a post

The full rules are in [README](../README.md#content). The short version:

1. Create `src/content/blog/yyyy-mm-dd_<slug>.md`. The filename date is the
   source of truth; there is no `date` frontmatter and no `slug` field.
2. Frontmatter:

   ```md
   ---
   title: 深夜裡的觀察筆記
   description: 一些在半夜寫下、隔天醒來常常覺得過於誠實的句子。
   tags:
     - 隨筆
   draft: false
   ---
   ```

3. Keep the slug lowercase `a-z`/`0-9` segments joined by single hyphens.
   [blog-filenames.test.ts](../src/lib/io/blog-filenames.test.ts) fails CI on a
   bad name.
4. Run `bun run build && bun run pagefind`, or restart the dev server.

Posts are language-agnostic: every locale shows the same set.

### Add a useful link

The whole list is one file,
[links/index.md](../src/content/links/index.md). Add a bullet:

```md
- [Display text](https://example.com): one short note
```

The visible heading is fixed chrome from `src/i18n` and switches with the
locale; the list itself is language-agnostic. Rebuild with
`bun run build && bun run pagefind`, or restart the dev server.

### Add a locale

A locale is client state, not a route. Adding one touches these files:

1. [locales.ts](../src/i18n/locales.ts): add the code to `LOCALE_CODES` and the
   `localeNames` / `langAttr` / `ogLocale` maps, and extend the navigator
   matching in `resolveClientLocale`.
2. [dictionaries/](../src/i18n/dictionaries): add the locale's chrome
   dictionary and wire it into `ui` in [index.ts](../src/i18n/index.ts).
3. [locale-boot.ts](../src/client/locale-boot.ts): its BCP-47 map and accepted
   codes are generated from `LOCALE_CODES`. Only the navigator prefix matching
   needs a hand edit to stay in sync with `resolveClientLocale`.
4. [T.tsx](../src/components/site/T.tsx): it maps `LOCALE_CODES`, so the static
   `[data-l]` variants appear automatically.
5. [parity.test.ts](../src/i18n/parity.test.ts): extend `FIXED_KEYS` and make
   sure every dictionary has the new key set.
6. Run `bun run test`, `bun run typecheck`, `bun run build`. No route, folder or
   URL changes are allowed.

Page content stays zh-hant. A new locale only changes fixed chrome, and the
pre-hydration default-locale flash remains an accepted trade-off.

## UX pattern references

These are references, each tied to a concrete surface in this repo. They are not
permission to add a new trend without a surface that needs it.

| Reference                                                       | Surface it informs                                                                               | What to take                                                                                                                          |
| :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Linear, Vercel and Superhuman style command palettes            | Global search: `SearchCommand`                                                                   | One keyboard-first overlay, grouped results, recent queries, empty-state quick links, Escape restores focus, `aria-live` result count |
| Spotify style sticky list                                       | `/music/` `MusicLibrary`                                                                         | Sticky filter and list header, dense scannable rows, filter state that survives scrolling, clear artist and song hierarchy            |
| Vercel web-interface guidelines                                 | Global chrome and forms: header, footer, language switcher, blog filters, empty and error states | Restrained surfaces, one clear hierarchy, visible focus, consistent spacing, no decorative clutter                                    |
| Photography portfolio negative-space and image-first principles | `/photographer/` and its Instagram wall                                                          | Images lead, generous whitespace, minimal chrome, captions reachable without hover, no layout that depends on a pointer               |

The command palette reference does not mean a second search trigger or a new
route. The Spotify reference does not mean adding audio playback. The
photography reference does not mean hosting photos in this repo; images stay
external or generated at build time.

## Do and do not

Do:

- Use design tokens and the documented brand utilities.
- Use `cva` for variants and `cn` for class merging.
- Compose the generated shadcn primitives and the shared kit.
- Design at 320 and 390 first, then enhance with `min-width` variants.
- Keep touch targets at 44px, inputs at 16px, and safe-area insets on fixed
  chrome.
- Make every hover affordance reachable by focus and touch.
- Keep chrome copy in `src/i18n` and page copy in MDX.
- Link to the [architecture map](./architecture.md) when you change a boundary.

Do not:

- Write raw hex, `rgb()` or `oklch()` in component classes.
- Add a second colour system, a second UI library or a Radix package.
- Hand-edit generated files under `src/components/ui/`.
- Redeclare `--radius-*` or `--text-*` in `@theme`.
- Add a desktop-first `max-width` override, except the compact-header switch in
  `tokens.css` / `LanguageSwitcher`.
- Hide horizontal overflow on `html` or `body`.
- Put page copy in `src/i18n`, `src/data` or a React page component.
- Add locale-prefixed routes or per-locale page folders.
- Add a second Zustand store or a second `requestAnimationFrame` loop.
- Leave a temporary probe component in the tree.

## Verify a design change

```sh
bun run typecheck
bun run lint
bun run test
bun run build
bun run pagefind
bun run test:links
bun run test:e2e
bun run test:a11y
bun run test:visual
bun run size
```

For a visual change, update and review the baselines:

```sh
bun run test:visual -- --update-snapshots
```

The full gate is in [CONTRIBUTING](../CONTRIBUTING.md) and runs in
[CI](../.github/workflows/ci.yml).
