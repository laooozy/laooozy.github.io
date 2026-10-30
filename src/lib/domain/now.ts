/**
 * The home page's "now" ticker data contract.
 *
 * The owner edits `src/data/now.json`; this module is the pure schema and the
 * one parser both the build guard and the tests use. An empty array is valid
 * and means "hide the status line"; anything malformed throws with the failing
 * field path so a bad edit fails the build by name rather than rendering an
 * empty or broken ticker.
 */

import { z } from "zod";

/** One item in the ticker: `text` is required, `href` is optional. */
export const nowItemSchema = z
  .object({
    text: z.string().min(1),
    href: z.string().min(1).optional(),
  })
  .strict();

/** The whole file: an ordered list of items (empty is valid). */
export const nowItemsSchema = z.array(nowItemSchema);

export type NowItem = z.infer<typeof nowItemSchema>;

/**
 * Validate the raw JSON value and return the typed items.
 *
 * Throws a single error naming every failing field (for example
 * `0.text: Too small…`) so a broken `now.json` fails the build with an
 * actionable message.
 */
export function parseNowItems(raw: unknown): NowItem[] {
  const result = nowItemsSchema.safeParse(raw);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Invalid src/data/now.json — ${details}`);
}
