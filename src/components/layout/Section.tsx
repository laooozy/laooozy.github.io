/**
 * Section — a page band with a heading slot and consistent internal rhythm.
 *
 * Props
 *  - id?: string        anchor id (also used to label the section)
 *  - heading?: string   renders an <h2> + wires aria-labelledby
 *  - lead?: string      supporting paragraph under the heading
 *  - actions?: ReactNode  optional top-right slot beside the heading (e.g. a
 *                         "view all" link). Ported from the `.astro` named slot
 *                         to a prop so React page components can pass it.
 *  - className?: string
 *  - children?: ReactNode  the section body
 *
 * Section owns its INTERNAL rhythm only — it sets no outer margin. Wrap
 * sections in a Stack to control the gap between them.
 */
import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  heading?: string;
  lead?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export default function Section({
  id,
  heading,
  lead,
  actions,
  className,
  children,
}: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      className={["section", className].filter(Boolean).join(" ")}
      aria-labelledby={heading && headingId ? headingId : undefined}
    >
      {(heading || actions) && (
        <div className="section__head">
          {heading && (
            <h2 id={headingId} className="section__title">
              {heading}
            </h2>
          )}
          {actions && <div className="section__actions">{actions}</div>}
        </div>
      )}
      {lead && <p className="section__lead">{lead}</p>}
      <div className="section__body">{children}</div>
    </section>
  );
}
