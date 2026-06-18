import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { CartomaniaSession } from './session';

const CARTOMANIA_SESSION_COOKIE = 'cartomania_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type MaybeCartomaniaSession = CartomaniaSession | null;

function encodeCartomaniaSession(session: CartomaniaSession): string {
	const json = JSON.stringify(session);
	return Buffer.from(json, 'utf8').toString('base64url');
}

function decodeCartomaniaSession(serialized: string | undefined | null): MaybeCartomaniaSession {
	if (!serialized) {
		return null;
	}
	try {
		const json = Buffer.from(serialized, 'base64url').toString('utf8');
		const parsed = JSON.parse(json) as CartomaniaSession;
		if (
			!parsed ||
			typeof parsed.token !== 'string' ||
			typeof parsed.user !== 'object' ||
			parsed.user === null
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

function setCartomaniaSessionCookie(cookies: Cookies, session: CartomaniaSession): void {
	cookies.set(CARTOMANIA_SESSION_COOKIE, encodeCartomaniaSession(session), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
	});
}

function clearCartomaniaSessionCookie(cookies: Cookies): void {
	cookies.delete(CARTOMANIA_SESSION_COOKIE, { path: '/' });
}

export {
	CARTOMANIA_SESSION_COOKIE,
	clearCartomaniaSessionCookie,
	decodeCartomaniaSession,
	encodeCartomaniaSession,
	setCartomaniaSessionCookie
};
