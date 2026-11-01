/**
 * Pre-paint locale bootstrap.
 *
 * `LOCALE_BOOT_SCRIPT` is injected INLINE into `<head>` (see
 * `BaseLayout.astro`) so it runs before first paint and reflects the resolved
 * locale on `<html>` — the CSS toggle then reveals the correct language with
 * zero flash. It is shipped verbatim into the HTML, so it MUST stay
 * self-contained plain JS: no imports, no TypeScript.
 *
 * The BCP-47 map, the accepted stored codes, the default and the storage key
 * are all generated HERE from `src/i18n/locales.ts` (this module runs at build
 * time, so it may import the metadata). Only the generated STRING ships, which
 * keeps the inline script self-contained while leaving one source of truth.
 * The resolution rules mirror `resolveClientLocale` in the same metadata module
 * — `locale-boot.test.ts` executes the string and asserts that parity.
 */

import {
  DEFAULT_LOCALE,
  langAttr,
  LOCALE_CODES,
  LOCALE_STORAGE_KEY,
} from "@/i18n/locales";

/** The BCP-47 map inlined into the boot script, generated from `langAttr`. */
const BCP47_JSON = JSON.stringify(
  Object.fromEntries(LOCALE_CODES.map((code) => [code, langAttr[code]])),
);

/** The accepted stored codes inlined into the boot script. */
const ACCEPTED_JSON = JSON.stringify(LOCALE_CODES);

/** The default locale inlined into the boot script. */
const DEFAULT_JSON = JSON.stringify(DEFAULT_LOCALE);

/** The storage key inlined into the boot script. */
const STORAGE_KEY_JSON = JSON.stringify(LOCALE_STORAGE_KEY);

export const LOCALE_BOOT_SCRIPT = `(function () {
	try {
		var stored = null;
		try {
			stored = window.localStorage.getItem(${STORAGE_KEY_JSON});
		} catch (e) {
			stored = null;
		}

		var BCP47 = ${BCP47_JSON};
		var ACCEPTED = ${ACCEPTED_JSON};
		var locale;

		if (stored !== null && ACCEPTED.indexOf(stored) !== -1) {
			locale = stored;
		} else {
			var nav = String(navigator.language || "").toLowerCase();
			if (
				nav.indexOf("zh-hans") === 0 ||
				nav.indexOf("zh-cn") === 0 ||
				nav.indexOf("zh-sg") === 0
			) {
				locale = "zh-hans";
			} else if (nav.indexOf("en") === 0) {
				locale = "en";
			} else {
				locale = ${DEFAULT_JSON};
			}
		}

		var root = document.documentElement;
		root.lang = BCP47[locale];
		root.dataset.locale = locale;

		try {
			window.localStorage.setItem(${STORAGE_KEY_JSON}, locale);
		} catch (e) {}
	} catch (e) {}
})();`;
