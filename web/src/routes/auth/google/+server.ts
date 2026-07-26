import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	GOOGLE_OAUTH_MODE_COOKIE,
	GOOGLE_OAUTH_STATE_COOKIE,
	resolveGoogleRedirectUri
} from '$lib/server/auth/googleOAuth';

/**
 * Start of the Google OAuth 2.0 / OIDC authorization-code flow.
 *
 * Sets a random `state` in a short-lived HttpOnly cookie and echoes it in the
 * consent URL; the callback verifies they match (CSRF protection). The client
 * secret is NOT here — the backend performs the code exchange.
 */
export const GET: RequestHandler = ({ url, cookies }) => {
	const clientId = env.GOOGLE_CLIENT_ID?.trim();
	if (!clientId) {
		throw error(503, 'Google sign-in is not configured yet.');
	}

	const state = crypto.randomUUID();
	cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
		path: '/auth/google',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 600
	});

	// 'link' connects Google to the already-signed-in account (from the account
	// page); anything else is a normal login/signup.
	const mode = url.searchParams.get('mode') === 'link' ? 'link' : 'login';
	cookies.set(GOOGLE_OAUTH_MODE_COOKIE, mode, {
		path: '/auth/google',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 600
	});

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: resolveGoogleRedirectUri(url.origin),
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'online',
		include_granted_scopes: 'true',
		state,
		prompt: 'select_account'
	});

	throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};
