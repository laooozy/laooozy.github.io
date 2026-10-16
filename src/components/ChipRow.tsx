import type { CSSProperties } from "react";
import Chip from "./ui/Chip";

/**
 * ChipRow — a wrapping row of Chips.
 *
 * Props
 *  - items: { label: string; href?: string; active?: boolean }[]
 *  - variant?: "tag" | "filter"   default: "tag"
 *      tag    → muted, non-interactive labels (post tags, interest items)
 *      filter → interactive controls (idle = outlined, active = filled)
 *  - ariaLabel?: string   names the row; needed for filter control groups
 *  - gap?: 1..12          default: 2
 *  - className?: string
 */
interface ChipItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface ChipRowProps {
  items: ChipItem[];
  variant?: "tag" | "filter";
  ariaLabel?: string;
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}

export default function ChipRow({
  items,
  variant = "tag",
  ariaLabel,
  gap = 2,
  className,
}: ChipRowProps) {
  if (items.length === 0) return null;

  return (
    <ul
      className={["chip-row", className].filter(Boolean).join(" ")}
      style={{ "--chip-row-gap": `var(--space-${gap})` } as CSSProperties}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <li key={item.label}>
          <Chip
            label={item.label}
            href={item.href}
            active={item.active}
            variant={variant}
          />
        </li>
      ))}
    </ul>
  );
}
