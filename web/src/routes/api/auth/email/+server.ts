import { json } from '@sveltejs/kit';
import { callBackendAuthed, requireSessionToken } from '$lib/server/auth/accountActions';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, locals, cookies }) => {
	const token = requireSessionToken(locals);
	const body = await request.json().catch(() => ({}));
	const user = (await callBackendAuthed(token, '/auth/email', 'PATCH', {
		email: body?.email
	})) as Record<string, unknown> | null;
	if (user) {
		setCartomaniaSessionCookie(cookies, { token, user: user as never });
	}
	return json({ user });
};
