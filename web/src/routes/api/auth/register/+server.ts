import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import {
	CartomaniaApiError,
	fetchAuthenticatedCartomaniaUserProfile,
	registerCartomaniaUserAccountWithConsent
} from '$lib/server/cartomania/client';

/** Forward the real client IP + UA so the backend records them with the consent. */
function forwardedContextHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
	if (ip) headers['x-real-ip'] = ip;
	const ua = request.headers.get('user-agent');
	if (ua) headers['user-agent'] = ua;
	return headers;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	const email = typeof body?.email === 'string' ? body.email.trim() : '';
	const password = typeof body?.password === 'string' ? body.password : '';
	const acceptTerms = body?.acceptTerms === true;

	if (!username || !email || !password) {
		return json({ message: 'Username, email and password are required.' }, { status: 400 });
	}
	if (!acceptTerms) {
		return json({ message: 'You must accept the Terms and Privacy Policy.' }, { status: 400 });
	}

	try {
		const { accessToken, user } = await registerCartomaniaUserAccountWithConsent(
			username,
			email,
			password,
			acceptTerms,
			forwardedContextHeaders(request)
		);
		const resolvedUser = await fetchAuthenticatedCartomaniaUserProfile(accessToken).catch(
			() => user
		);
		setCartomaniaSessionCookie(cookies, { token: accessToken, user: resolvedUser });
		return json({ user: resolvedUser });
	} catch (error) {
		if (error instanceof CartomaniaApiError) {
			return json(
				{ message: error.bodyText || 'Could not create the account.' },
				{ status: error.status }
			);
		}
		return json({ message: 'Could not create the account.' }, { status: 500 });
	}
};
