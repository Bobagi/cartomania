import type { LayoutServerLoad } from './$types';
import { CONSENT_COOKIE } from '$lib/consent/consent';

export const load: LayoutServerLoad = async ({ locals, cookies }) => ({
	authUser: locals.cartomaniaSession?.user ?? null,
	locale: locals.locale,
	// Raw consent cookie ('all' | 'essential' | undefined); the client seeds the
	// consent store from it so SSR and hydration agree and analytics only loads
	// for visitors who have already accepted.
	consentCookie: cookies.get(CONSENT_COOKIE) ?? null
});
