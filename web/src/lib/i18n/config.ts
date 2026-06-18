/**
 * Locale configuration for the Cartomania i18n system. Kept framework-agnostic so
 * it can run on the server (hooks / layout load) and the client alike.
 */

export const SUPPORTED_LOCALES = ['en', 'pt', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie that persists the visitor's chosen language across requests. */
export const LOCALE_COOKIE = 'cartomania_locale';

/** Native language names shown in the selector. */
export const LOCALE_LABELS: Record<Locale, string> = {
	en: 'English',
	pt: 'Português',
	es: 'Español'
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the best locale: an explicit cookie wins, otherwise we look at the
 * browser's Accept-Language header, otherwise we fall back to the default.
 */
export function resolveLocale(
	cookieValue?: string | null,
	acceptLanguageHeader?: string | null
): Locale {
	if (isLocale(cookieValue)) return cookieValue;

	const header = (acceptLanguageHeader ?? '').toLowerCase();
	for (const part of header.split(',')) {
		const tag = part.trim().split(';')[0];
		const base = tag.split('-')[0];
		if (isLocale(base)) return base;
	}
	return DEFAULT_LOCALE;
}
