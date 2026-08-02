import type { LayoutServerLoad } from './$types';
import { CONSENT_COOKIE } from '$lib/consent/consent';
import { fetchCartomaniaAgreementStatus } from '$lib/server/cartomania/client';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const session = locals.cartomaniaSession;

	// For a signed-in user, check whether they have accepted the Terms/Privacy
	// version in force. New registrations accept at signup; legacy accounts and
	// Google sign-ins are prompted by the AgreementGate. Fail-open on a transient
	// read error so the game is never blocked by an infra hiccup.
	let termsAccepted = true;
	let agreementVersion = '';
	if (session?.token) {
		try {
			const status = await fetchCartomaniaAgreementStatus(session.token);
			termsAccepted = status.accepted;
			agreementVersion = status.currentVersion;
		} catch {
			termsAccepted = true;
		}
	}

	return {
		authUser: session?.user ?? null,
		termsAccepted,
		agreementVersion,
		locale: locals.locale,
		// Raw consent cookie ('all' | 'essential' | undefined); the client seeds the
		// consent store from it so SSR and hydration agree and analytics only loads
		// for visitors who have already accepted.
		consentCookie: cookies.get(CONSENT_COOKIE) ?? null
	};
};
