/**
 * Chip — a small pill. Two visually distinct roles, never mixed:
 *
 *  - variant="tag"    NON-interactive label (muted surface, no hover, no href).
 *                     Used for post tags and interest items.
 *  - variant="filter" a CONTROL (outlined when idle, filled when active).
 *                     Used for filter/segment controls. Give it an `href` for
 *                     links, or leave it off to render a <button>.
 *
 * Props
 *  - label: string
 *  - href?: string            renders an <a>; active links get aria-current
 *  - active?: boolean         filled control state (filters only)
 *  - variant?: "tag" | "filter"   default: "tag"
 *  - className?: string
 */
interface ChipProps {
  label: string;
  href?: string;
  active?: boolean;
  variant?: "tag" | "filter";
  className?: string;
}

export default function Chip({
  label,
  href,
  active = false,
  variant = "tag",
  className,
}: ChipProps) {
  const isFilter = variant === "filter";
  const Tag = href ? "a" : isFilter ? "button" : "span";

  return (
    <Tag
      className={["chip", `chip--${variant}`, active && "is-active", className]
        .filter(Boolean)
        .join(" ")}
      {...(href ? { href } : {})}
      {...(Tag === "button" ? { type: "button" } : {})}
      {...(active && href ? { "aria-current": "page" } : {})}
      {...(active && Tag === "button" ? { "aria-pressed": "true" } : {})}
    >
      {label}
    </Tag>
  );
}
