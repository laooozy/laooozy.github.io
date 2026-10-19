/**
 * About card data — the ordered list the home About grid renders.
 *
 * This file holds ONLY the card order and locale-INDEPENDENT data. Every label
 * and note a visitor reads is a translated string; those live in `src/i18n`
 * (authored per locale) and are resolved here through the stable `titleKey` /
 * `noteKey` paths below. Nothing in this module is user-facing text, so the
 * locale model stays intact (see `AGENTS.md`: `src/data/**` is
 * locale-independent data only).
 *
 * Two kinds of value are locale-independent and therefore live here:
 *  - the Photography gear list — verbatim camera / lens / flash product names,
 *    which are never translated (the `▏` in the Sigma line separates the model
 *    name from Sigma's product line and is intentional, not a typo);
 *  - the ACG card's in-site link target (`/acg/`), since the site has a single
 *    URL space and that URL does not change per locale.
 *
 * `aboutCards` is the source of truth for card ORDER: reorder the array to
 * reorder the home About grid.
 */

/** Stable identifier for each of the five About cards. */
export type AboutCardId = "runner" | "photography" | "games" | "vtuber" | "acg";

/**
 * One gear-list entry: a verbatim product name and, optionally, a dotted i18n
 * key for a locale-dependent note about that item.
 */
export interface AboutGearItem {
  /** Verbatim product name; never translated. */
  name: string;
  /** Optional dotted i18n key for a locale-dependent note (never translated text here). */
  noteKey?: string;
}

/** One About card: an id, its i18n key paths, and any locale-independent extras. */
export interface AboutCard {
  /** Stable card id (used as the React key and for tests). */
  id: AboutCardId;
  /** Dotted i18n key path for the card title (translated; lives in `src/i18n`). */
  titleKey: string;
  /** Dotted i18n key path for the card note / body (translated; lives in `src/i18n`). */
  noteKey: string;
  /** Dotted i18n key path for the gear-list intro line (Photography card only). */
  gearIntroKey?: string;
  /** Locale-independent gear list (Photography card only). */
  gear?: readonly AboutGearItem[];
  /** Locale-independent link target (ACG card only). */
  href?: string;
}

/**
 * Photography gear — verbatim product names, never translated.
 *
 * `▏` (U+258F) is the intended separator between the lens name and Sigma's
 * `Contemporary` product line; do not "fix" it.
 */
export const photographyGear: readonly AboutGearItem[] = [
  { name: "Canon EOS R10" },
  { name: "Canon RF-S18-150mm F3.5-6.3 IS STM" },
  {
    name: "Sigma 30mm F1.4 DC DN ▏Contemporary",
    noteKey: "home.interests.sigmaNote",
  },
  { name: "Godox V1mid" },
  { name: "Godox X3 Pro" },
];

/** The ACG card's in-site link target (single URL space). */
export const acgCardHref = "/acg/";

/**
 * The five About cards, in display order:
 * Runner → Photography → Games → VTuber → ACG.
 */
export const aboutCards = [
  {
    id: "runner",
    titleKey: "home.interests.runner",
    noteKey: "home.interests.runnerNote",
  },
  {
    id: "photography",
    titleKey: "home.interests.photography",
    noteKey: "home.interests.photographyNote",
    gearIntroKey: "home.interests.photographyGearIntro",
    gear: photographyGear,
  },
  {
    id: "games",
    titleKey: "home.interests.games",
    noteKey: "home.interests.gamesNote",
  },
  {
    id: "vtuber",
    titleKey: "home.interests.vtuber",
    noteKey: "home.interests.vtuberNote",
  },
  {
    id: "acg",
    titleKey: "acg.heading",
    noteKey: "acg.note",
    href: acgCardHref,
  },
] as const satisfies readonly AboutCard[];
