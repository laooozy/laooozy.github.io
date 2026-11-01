import { cva, type VariantProps } from "class-variance-authority";

/**
 * Typed Tailwind variants for the shared typography primitives.
 *
 * Every value is a COMPLETE class string so Tailwind's scanner can see it at
 * build time. Sizes pull the brand `--text-*` scale from `tokens.css` through
 * arbitrary length values; the numeric Tailwind sizes are NOT the brand scale
 * and would drift from the design tokens.
 */

export const headingVariants = cva(
  "m-0 font-heading leading-tight font-semibold tracking-[var(--tracking-display)] text-balance",
  {
    variants: {
      level: {
        1: "text-[length:var(--text-4xl)]",
        2: "text-[length:var(--text-3xl)]",
        3: "text-[length:var(--text-2xl)]",
        4: "text-[length:var(--text-base)]",
      },
      size: {
        hero: "text-[length:var(--text-hero)] font-bold",
        xl: "text-[length:var(--text-3xl)]",
        lg: "text-[length:var(--text-2xl)]",
        md: "text-[length:var(--text-xl)]",
      },
      tone: {
        default: "",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      level: 2,
      tone: "default",
    },
  },
);

export type HeadingVariants = VariantProps<typeof headingVariants>;
export type HeadingLevel = NonNullable<HeadingVariants["level"]>;
export type HeadingSize = NonNullable<HeadingVariants["size"]>;
export type TypographyTone = NonNullable<HeadingVariants["tone"]>;

export const textVariants = cva("m-0", {
  variants: {
    size: {
      xs: "text-[length:var(--text-xs)]",
      sm: "text-[length:var(--text-sm)]",
      base: "text-[length:var(--text-base)]",
      lg: "text-[length:var(--text-lg)]",
      xl: "text-[length:var(--text-xl)]",
    },
    tone: {
      default: "",
      muted: "text-muted-foreground",
    },
    measure: {
      true: "max-w-[var(--measure)] text-pretty",
      false: "",
    },
  },
  defaultVariants: {
    size: "base",
    tone: "default",
    measure: false,
  },
});

export type TextVariants = VariantProps<typeof textVariants>;
export type TextSize = NonNullable<TextVariants["size"]>;
export type TextMeasure = NonNullable<TextVariants["measure"]>;

/**
 * The article/links body type system (`prose-brand` in `global.css` layered on
 * Tailwind Typography). `Prose` is for React contexts only: the shipped
 * Markdown article body stays Astro-rendered.
 */
export const proseClasses = "prose prose-invert prose-brand";
