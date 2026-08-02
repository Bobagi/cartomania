import { env } from '$env/dynamic/private';

/** Short-lived cookie holding the OAuth `state` (CSRF) between start and callback. */
export const GOOGLE_OAUTH_STATE_COOKIE = 'g_oauth_state';

/** Marks the callback intent: 'login' (default) vs 'link' (connect to current account). */
export const GOOGLE_OAUTH_MODE_COOKIE = 'g_oauth_mode';

/**
 * The redirect URI must be identical in the authorization request and the token
 * exchange, so both endpoints derive it the same way.
 */
export function resolveGoogleRedirectUri(origin: string): string {
	return env.GOOGLE_REDIRECT_URI?.trim() || `${origin}/auth/google/callback`;
}
