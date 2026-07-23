import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import {
	authenticateCartomaniaWithGoogleCode,
	fetchAuthenticatedCartomaniaUserProfile
} from '$lib/server/cartomania/client';
import { GOOGLE_OAUTH_STATE_COOKIE, resolveGoogleRedirectUri } from '$lib/server/auth/googleOAuth';

function forwardedContextHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
	if (ip) headers['x-real-ip'] = ip;
	const ua = request.headers.get('user-agent');
	if (ua) headers['user-agent'] = ua;
	return headers;
}

/**
 * Google OAuth callback. Verifies the CSRF `state`, then hands the single-use
 * `code` to the backend (which owns the client secret and does the exchange) and,
 * on success, sets the session cookie.
 */
export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const expectedState = cookies.get(GOOGLE_OAUTH_STATE_COOKIE);
	cookies.delete(GOOGLE_OAUTH_STATE_COOKIE, { path: '/auth/google' });

	const oauthError = url.searchParams.get('error');
	if (oauthError) throw redirect(303, '/?googleAuth=denied');

	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	if (!code || !state || !expectedState || state !== expectedState) {
		throw redirect(303, '/?googleAuth=state');
	}

	try {
		const { accessToken, user } = await authenticateCartomaniaWithGoogleCode(
			code,
			resolveGoogleRedirectUri(url.origin),
			forwardedContextHeaders(request)
		);
		const resolvedUser = await fetchAuthenticatedCartomaniaUserProfile(accessToken).catch(
			() => user
		);
		setCartomaniaSessionCookie(cookies, { token: accessToken, user: resolvedUser });
	} catch {
		throw redirect(303, '/?googleAuth=error');
	}

	throw redirect(303, '/');
};
