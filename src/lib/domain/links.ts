/**
 * Useful-links domain — PURE.
 *
 * The `/links/` page keeps ONE hand-edited Markdown file as its source
 * (`src/content/links/index.md`). The page needs the list as data so each entry
 * can be rendered as a card, so this module turns that small, documented
 * Markdown subset into plain records at build time:
 *
 * ```md
 * Intro paragraph, optional.
 *
 * - [Label](https://example.com) — one short note
 * ```
 *
 * It is deliberately NOT a Markdown implementation. It accepts exactly the
 * format the owner writes: paragraphs for the intro, bullet links for the list,
 * an optional `—`/`–`/`-` note after the link, and HTML comments (the authoring
 * template) are ignored. A malformed bullet is a build error naming the line,
 * so a typo cannot silently drop a link.
 *
 * No Astro, no DOM, no content-collection imports.
 */

/** One bullet from the Markdown list. */
export interface UsefulLink {
  /** Visible link text. */
  label: string;
  /** Absolute `http(s)` destination. */
  href: string;
  /** Optional trailing note after the separator. */
  note?: string;
}

export interface LinksContent {
  /** Intro paragraphs, in document order. */
  intro: string[];
  /** Bullet links, in document order. */
  links: UsefulLink[];
}

/** `- [Label](https://…) — note` (the note separator is optional). */
const BULLET_RE = /^[-*+]\s+\[([^\]]+)\]\(([^)\s]+)\)(?:\s+[—–-]\s+(.+))?$/u;

/** A line that starts a bullet but does not match the accepted format. */
const BULLET_START_RE = /^[-*+]\s+/u;

/** Remove Handlebars-style comments, which hold the authoring template. */
function stripComments(source: string): string {
  return source.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Parse the links Markdown into its intro paragraphs and link records.
 *
 * @throws if a bullet is malformed, if its label is empty, or if its target is
 * not an absolute `http(s)` URL. The message names the 1-based line so the
 * owner can fix the file without opening this module.
 */
export function parseLinksMarkdown(source: string): LinksContent {
  const intro: string[] = [];
  const links: UsefulLink[] = [];

  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    intro.push(paragraph.join(" "));
    paragraph = [];
  };

  const lines = stripComments(source).split(/\r?\n/u);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;

    if (line === "") {
      flushParagraph();
      return;
    }

    if (!BULLET_START_RE.test(line)) {
      paragraph.push(line);
      return;
    }

    flushParagraph();

    const match = BULLET_RE.exec(line);
    if (!match) {
      throw new Error(
        `Invalid link bullet on line ${lineNumber}: "${line}". ` +
          `Expected "- [Label](https://example.com) — note".`,
      );
    }

    const label = match[1].trim();
    const href = match[2].trim();
    const note = match[3]?.trim();

    if (!label) {
      throw new Error(`Empty link label on line ${lineNumber}.`);
    }

    let parsed: URL;
    try {
      parsed = new URL(href);
    } catch {
      throw new Error(
        `Invalid link URL on line ${lineNumber}: "${href}" is not absolute.`,
      );
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Invalid link URL on line ${lineNumber}: "${href}" must use http(s).`,
      );
    }

    links.push({
      label,
      href: parsed.href,
      ...(note ? { note } : {}),
    });
  });

  flushParagraph();

  return { intro, links };
}
