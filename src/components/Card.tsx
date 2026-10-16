import type { ReactNode } from "react";

/**
 * Card — the reusable glass surface.
 *
 * Renders as a <div> by default, or an <a> when `href` is given (then it is
 * automatically interactive: hover glow + lift). Pass `interactive` to opt a
 * plain <div> into the hover affordance.
 */
interface CardProps {
  href?: string;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function Card({
  href,
  interactive = false,
  className,
  children,
}: CardProps) {
  const Tag = href ? "a" : "div";
  const isInteractive = interactive || Boolean(href);

  return (
    <Tag
      {...(href ? { href } : {})}
      className={["card", isInteractive && "card--interactive", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
