import { json } from '@sveltejs/kit';
import { callBackendAuthed, requireSessionToken } from '$lib/server/auth/accountActions';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const token = requireSessionToken(locals);
	const body = await request.json().catch(() => ({}));
	// The backend bumps tokenVersion (revoking OTHER sessions) and returns a fresh
	// token for THIS device — re-set the cookie or the current session dies too.
	const result = (await callBackendAuthed(token, '/auth/password', 'PATCH', {
		currentPassword: body?.currentPassword,
		newPassword: body?.newPassword
	})) as { accessToken?: string; user?: unknown } | null;

	if (result?.accessToken && result?.user) {
		setCartomaniaSessionCookie(cookies, {
			token: result.accessToken,
			user: result.user as never
		});
	}
	return json({ ok: true, user: result?.user ?? null });
};
