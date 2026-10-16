/**
 * Pre-paint locale bootstrap.
 *
 * `LOCALE_BOOT_SCRIPT` is injected INLINE into `<head>` (see
 * `BaseLayout.astro`) so it runs before first paint and reflects the resolved
 * locale on `<html>` — the CSS toggle then reveals the correct language with
 * zero flash. It is shipped verbatim into the HTML, so it MUST stay
 * self-contained plain JS: no imports, no TypeScript, and the BCP-47 map is
 * inlined because `langAttr` cannot be imported. The resolution rules mirror
 * `resolveClientLocale` in `src/i18n/index.ts` — keep the two in sync.
 */
export const LOCALE_BOOT_SCRIPT = `(function () {
	try {
		var stored = null;
		try {
			stored = window.localStorage.getItem("locale");
		} catch (e) {
			stored = null;
		}

		var BCP47 = { "zh-hant": "zh-Hant", "zh-hans": "zh-Hans", "en": "en" };
		var locale;

		if (stored === "zh-hant" || stored === "zh-hans" || stored === "en") {
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
				locale = "zh-hant";
			}
		}

		var root = document.documentElement;
		root.lang = BCP47[locale];
		root.dataset.locale = locale;

		try {
			window.localStorage.setItem("locale", locale);
		} catch (e) {}
	} catch (e) {}
})();`;
