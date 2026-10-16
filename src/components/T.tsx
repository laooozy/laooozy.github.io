import type { JSX } from "react";
import { t, type Locale } from "@/i18n";

/**
 * Static all-locale translation component.
 *
 * Renders the SAME dotted key `k` in ALL three locales, each value in its own
 * element carrying `data-l="<locale>"`. A CSS toggle on `html[data-locale]`
 * (see `global.css`) reveals only the active locale's span and hides the rest
 * with `display: none` (so hidden locales leave the accessibility tree).
 *
 * This is a pure server component: it reads NO locale at render time, holds no
 * state and runs no effects, so its output is identical at build and on the
 * client and it never hydrates. It is usable both inside React components and
 * directly in `.astro` files.
 *
 * With no `data-locale` on `<html>` (e.g. JavaScript disabled) the CSS falls
 * back to showing `data-l="zh-hant"`, the default locale.
 */
const LOCALES: readonly Locale[] = ["zh-hant", "zh-hans", "en"];

interface TProps {
  /** Dotted dictionary key, e.g. `"nav.blog"`. */
  k: string;
  /** Element to render each locale into. Defaults to `"span"`. */
  as?: keyof JSX.IntrinsicElements;
}

export default function T({ k, as: Tag = "span" }: TProps) {
  return (
    <>
      {LOCALES.map((locale) => (
        <Tag key={locale} data-l={locale}>
          {t(locale, k)}
        </Tag>
      ))}
    </>
  );
}
