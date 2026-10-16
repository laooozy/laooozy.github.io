/**
 * Locale-source adapter — a port over the browser's preferred-language hint.
 *
 * The port returns a RAW BCP-47-ish string (e.g. `"zh-Hans-CN"`, `"en-US"`); it
 * deliberately does NOT narrow to the app's `Locale` union. Mapping a raw tag to
 * a supported locale is the pure `resolveLocale` core's job, keeping detection
 * (I/O) and resolution (pure) separate. Never throws.
 */

/** Reads the platform's preferred language tag, or `null` when unavailable. */
export interface LocaleSourcePort {
  read(): string | null;
}

/** Real adapter over `navigator.language`, guarded and total. */
export const navigatorLocaleSource: LocaleSourcePort = {
  read() {
    try {
      const language =
        typeof navigator === "undefined" ? undefined : navigator.language;
      const trimmed = language?.trim();
      return trimmed ? trimmed : null;
    } catch {
      return null;
    }
  },
};

/** Deterministic test double returning a fixed tag (or `null`). */
export function fixedLocaleSource(value: string | null): LocaleSourcePort {
  return { read: () => value };
}
