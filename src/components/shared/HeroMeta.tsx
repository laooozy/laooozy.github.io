import { cn } from "@/lib/utils";

export interface HeroMetaItem {
  label: string;
  value: string;
  /** Optional link target; the value renders as an anchor when set. */
  href?: string;
}

export interface HeroMetaProps {
  /** Right-column spec rows (Base / Now / Instagram …). */
  meta?: HeroMetaItem[];
  className?: string;
}

/**
 * HeroMeta — the hero's right-column spec panel.
 *
 * A row with `href` renders its value as a link whose vertical padding grows
 * the tap area to 44px without shifting the baseline row.
 */
export default function HeroMeta({ meta = [], className }: HeroMetaProps) {
  if (meta.length === 0) return null;

  return (
    <dl className={cn("hero__meta", className)}>
      {meta.map((row) => (
        <div className="hero__meta-row" key={`${row.label}-${row.value}`}>
          <dt>{row.label}</dt>
          <dd>
            {row.href ? (
              <a
                className="py-[var(--space-3)] text-inherit no-underline hover:text-[var(--accent-text)] hover:underline focus-visible:text-[var(--accent-text)] focus-visible:underline"
                href={row.href}
              >
                {row.value}
              </a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
