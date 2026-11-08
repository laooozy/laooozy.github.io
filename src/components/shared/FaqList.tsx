import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export interface FaqListProps {
  items: readonly FaqItem[];
  className?: string;
}

/**
 * FaqList — native `<details>` rows with a quiet chevron.
 *
 * The answer is real HTML in the document and is hidden by the browser until
 * the visitor opens its question, so this stays a build-time component with no
 * island and no client-side state. The whole summary row is the target, the
 * chevron rotates only as state feedback, and the native element owns keyboard
 * and assistive-technology behaviour.
 */
export default function FaqList({ items, className }: FaqListProps) {
  return (
    <div
      className={cn(
        "max-w-[var(--measure)] border-t border-[var(--glass-border)]",
        className,
      )}
      data-faq-list
    >
      {items.map(({ question, answer }) => (
        <details
          key={question}
          className="group border-b border-[var(--glass-border)]"
          data-faq-item
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-[var(--space-4)] py-[var(--space-4)] text-left font-heading text-[length:var(--text-lg)] font-semibold text-foreground transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-[var(--accent-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] [&::-webkit-details-marker]:hidden">
            <span>{question}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] group-open:rotate-180 group-hover:text-[var(--accent-text)] motion-reduce:transition-none"
            />
          </summary>
          <div
            className="max-w-[var(--measure)] pb-[var(--space-5)] text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-pretty text-muted-foreground"
            data-faq-answer
          >
            {answer}
          </div>
        </details>
      ))}
    </div>
  );
}
