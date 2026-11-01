/**
 * The build-time read of the owner-edited `src/data/now.json`.
 *
 * Importing this module validates the JSON (through the pure schema in
 * `lib/domain/now.ts`), so a malformed file fails `astro build` at the import
 * instead of shipping a broken or empty ticker. The file is bundled, never
 * fetched from the client.
 */

import rawNow from "../../data/now.json";
import { type NowItem, parseNowItems } from "../domain/now";

export const nowItems: readonly NowItem[] = parseNowItems(rawNow);
