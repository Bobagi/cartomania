import { json } from '@sveltejs/kit';
import { callBackendAuthed, requireSessionToken } from '$lib/server/auth/accountActions';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const token = requireSessionToken(locals);
	const body = await request.json().catch(() => ({}));
	const user = (await callBackendAuthed(token, '/auth/username', 'PATCH', {
		username: body?.username
	})) as AuthenticatedCartomaniaUser;
	setCartomaniaSessionCookie(cookies, { token, user });
	return json({ user });
};
