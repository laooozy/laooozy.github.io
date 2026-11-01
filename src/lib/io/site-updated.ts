/**
 * The build-time read of `src/data/site-updated.json`, the footer update stamp.
 *
 * The file is committed and rewritten by the pre-commit hook; the site bundles
 * it, never fetches it. The stamp is a local wall-clock instant written as
 * `YYYY-MM-DDTHH:mm`: it is intentionally NOT a `Date` and never re-converted
 * through a timezone, so every visitor sees the owner's local minute as-is.
 *
 * A malformed stamp fails the import (and therefore the build) with the bad
 * value in the message instead of rendering an empty `<time>`.
 *
 * `SITE_UPDATED_FIXTURE` is the E2E-only seam (set by `e2e:serve`): the stamp
 * changes on every commit, so a screenshot baseline cannot pin the real value.
 * Production builds never set it and always render the committed stamp.
 */

import rawSiteUpdated from "../../data/site-updated.json";
import { SITE_UPDATED_FIXTURE_STAMP } from "./site-updated-fixture";

/** The one accepted stamp shape: `YYYY-MM-DDTHH:mm`, local time, no zone. */
const STAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** The footer stamp: `iso` for `<time dateTime>`, `display` for the text. */
export interface SiteUpdated {
  /** The committed stamp verbatim, for the machine-readable attribute. */
  readonly iso: string;
  /** The same stamp with the date and minute separated by one space. */
  readonly display: string;
}

/** Days in `month` (1-12) for `year`, accounting for leap years. */
function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Reject a date/time field that is two digits but out of its calendar range. */
function assertRange(raw: unknown, value: string): void {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));

  const inRange =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59;

  if (!inRange) {
    throw new Error(
      `Invalid src/data/site-updated.json — updatedAt: ${JSON.stringify(raw)} is not a real local YYYY-MM-DDTHH:mm stamp`,
    );
  }
}

/**
 * Validate a raw `src/data/site-updated.json` value and derive the footer
 * rendering pair. Throws with the offending value in the message.
 */
export function parseSiteUpdated(raw: unknown): SiteUpdated {
  const value =
    raw !== null && typeof raw === "object"
      ? (raw as { updatedAt?: unknown }).updatedAt
      : undefined;

  if (typeof value !== "string" || !STAMP_PATTERN.test(value)) {
    throw new Error(
      `Invalid src/data/site-updated.json — updatedAt: ${JSON.stringify(value)} is not a YYYY-MM-DDTHH:mm stamp`,
    );
  }

  assertRange(raw, value);

  return { iso: value, display: `${value.slice(0, 10)} ${value.slice(11)}` };
}

/** The validated stamp the footer renders; imported at build time. */
export const siteUpdated: SiteUpdated = parseSiteUpdated(
  process.env.SITE_UPDATED_FIXTURE === "1"
    ? { updatedAt: SITE_UPDATED_FIXTURE_STAMP }
    : rawSiteUpdated,
);
