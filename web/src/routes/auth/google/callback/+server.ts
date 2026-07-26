import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import {
	authenticateCartomaniaWithGoogleCode,
	fetchAuthenticatedCartomaniaUserProfile,
	linkCartomaniaGoogleCode
} from '$lib/server/cartomania/client';
import {
	GOOGLE_OAUTH_MODE_COOKIE,
	GOOGLE_OAUTH_STATE_COOKIE,
	resolveGoogleRedirectUri
} from '$lib/server/auth/googleOAuth';

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
 * `code` to the backend (which owns the client secret and does the exchange).
 * Two modes: 'login' (default - sets a fresh session) and 'link' (connects Google
 * to the already-signed-in account).
 */
export const GET: RequestHandler = async ({ url, cookies, request, locals }) => {
	const expectedState = cookies.get(GOOGLE_OAUTH_STATE_COOKIE);
	const mode = cookies.get(GOOGLE_OAUTH_MODE_COOKIE) ?? 'login';
	cookies.delete(GOOGLE_OAUTH_STATE_COOKIE, { path: '/auth/google' });
	cookies.delete(GOOGLE_OAUTH_MODE_COOKIE, { path: '/auth/google' });

	const isLink = mode === 'link';
	const failDest = isLink ? '/account?google=error' : '/?googleAuth=error';

	const oauthError = url.searchParams.get('error');
	if (oauthError) throw redirect(303, isLink ? '/account?google=denied' : '/?googleAuth=denied');

	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	if (!code || !state || !expectedState || state !== expectedState) {
		throw redirect(303, isLink ? '/account?google=state' : '/?googleAuth=state');
	}

	const redirectUri = resolveGoogleRedirectUri(url.origin);

	if (isLink) {
		// Connect Google to the current session's account (not by email).
		const token = locals.cartomaniaSession?.token;
		if (!token) throw redirect(303, '/?googleAuth=state');
		try {
			await linkCartomaniaGoogleCode(token, code, redirectUri);
			// Refresh the cookie's user snapshot (googleLinked changed).
			const refreshed = await fetchAuthenticatedCartomaniaUserProfile(token).catch(() => null);
			if (refreshed) setCartomaniaSessionCookie(cookies, { token, user: refreshed });
		} catch {
			throw redirect(303, failDest);
		}
		throw redirect(303, '/account?google=linked');
	}

	try {
		const { accessToken, user } = await authenticateCartomaniaWithGoogleCode(
			code,
			redirectUri,
			forwardedContextHeaders(request)
		);
		const resolvedUser = await fetchAuthenticatedCartomaniaUserProfile(accessToken).catch(
			() => user
		);
		setCartomaniaSessionCookie(cookies, { token: accessToken, user: resolvedUser });
	} catch {
		throw redirect(303, failDest);
	}

	throw redirect(303, '/');
};
