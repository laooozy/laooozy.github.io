import type { JSX, ReactNode } from "react";

/**
 * Heading — a display heading on the brand type scale.
 *
 * Props
 *  - level?: 1 | 2 | 3 | 4        default: 2 (renders the matching <hN>)
 *  - size?: "hero" | "xl" | "lg" | "md"   optional size override
 *  - tone?: "default" | "muted"
 *  - id?: string         DOM id (e.g. to wire a section's aria-labelledby)
 *  - className?: string
 *
 * Global element styles already cover the base scale; `size` is for the few
 * places that need to break it (e.g. a hero wordmark).
 */
interface HeadingProps {
  level?: 1 | 2 | 3 | 4;
  size?: "hero" | "xl" | "lg" | "md";
  tone?: "default" | "muted";
  id?: string;
  className?: string;
  children?: ReactNode;
}

export default function Heading({
  level = 2,
  size,
  tone = "default",
  id,
  className,
  children,
}: HeadingProps) {
  // Typed as a JSX tag so a dynamic tag keeps its intrinsic props (id, class, …).
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag
      id={id}
      className={[
        "heading",
        size && `heading--${size}`,
        tone === "muted" && "heading--muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
