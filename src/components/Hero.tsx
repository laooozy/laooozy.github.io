/**
 * Hero — the home masthead. The fold's anchor: who this is, what's happening
 * now, and the way in.
 *
 * Props
 *  - title: string                     the wordmark (rendered as <h1>)
 *  - tagline: string                   one-line description
 *  - nowLabel?: string                 small status label, e.g. "Now"
 *  - nowText?: string                  the "now" line beside the status dot
 *  - links?: { label; href }[]         compact quick-link row (Blog / ACG / …)
 *  - linksLabel?: string               aria-label for the quick-link nav
 *  - meta?: { label; value }[]         right-column spec rows (Base / Now / …)
 *  - className?: string
 *
 * Two columns ≥60rem (text + spec panel), stacked below. The spec panel and a
 * single soft aurora glow are the "featured visual" — no photos are hosted.
 */
interface HeroLink {
  label: string;
  href: string;
}

interface HeroMeta {
  label: string;
  value: string;
}

interface HeroProps {
  title: string;
  tagline: string;
  nowLabel?: string;
  nowText?: string;
  links?: HeroLink[];
  linksLabel?: string;
  meta?: HeroMeta[];
  className?: string;
}

export default function Hero({
  title,
  tagline,
  nowLabel,
  nowText,
  links = [],
  linksLabel,
  meta = [],
  className,
}: HeroProps) {
  return (
    <header className={["hero", className].filter(Boolean).join(" ")}>
      <div className="hero__main">
        {nowLabel && (
          <p className="hero__status">
            <span className="hero__dot" aria-hidden="true" />
            <span className="hero__status-label">{nowLabel}</span>
            {nowText && <span className="hero__status-text">{nowText}</span>}
          </p>
        )}

        <h1 className="hero__title">
          {title}
          <span className="hero__period" aria-hidden="true">
            .
          </span>
        </h1>

        <p className="hero__tagline">{tagline}</p>

        {links.length > 0 && (
          <nav className="hero__links" aria-label={linksLabel}>
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <a className="hero__link" href={link.href}>
                    <span>{link.label}</span>
                    <span className="hero__link-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {meta.length > 0 && (
        <dl className="hero__meta">
          {meta.map((row) => (
            <div className="hero__meta-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
