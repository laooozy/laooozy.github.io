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
    <dl
      className={cn(
        "hero__meta relative z-[1] m-0 flex flex-col border-t border-[color-mix(in_oklab,var(--glass-border)_45%,transparent)] motion-safe:animate-fade-in",
        className,
      )}
    >
      {meta.map((row) => (
        <div
          className="hero__meta-row flex flex-wrap items-baseline justify-between gap-x-[var(--space-5)] gap-y-[var(--space-2)] border-b border-[color-mix(in_oklab,var(--glass-border)_25%,transparent)] py-[var(--space-4)]"
          key={`${row.label}-${row.value}`}
        >
          <dt className="font-mono text-[length:var(--text-xs)] text-[var(--text-muted)]">
            {row.label}
          </dt>
          <dd className="m-0 text-right text-[length:var(--text-base)] font-medium text-[var(--text)]">
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
