import { json } from '@sveltejs/kit';
import { callBackendAuthed, requireSessionToken } from '$lib/server/auth/accountActions';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	const token = requireSessionToken(locals);
	const user = (await callBackendAuthed(token, '/auth/google/unlink', 'POST')) as Record<
		string,
		unknown
	> | null;
	if (user) {
		setCartomaniaSessionCookie(cookies, { token, user: user as never });
	}
	return json({ user });
};
