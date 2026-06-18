import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setCartomaniaSessionCookie } from '$lib/server/auth/cookies';
import {
	CartomaniaApiError,
	fetchAuthenticatedCartomaniaUserProfile,
	loginCartomaniaUserAccount
} from '$lib/server/cartomania/client';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	const password = typeof body?.password === 'string' ? body.password : '';

	if (!username || !password) {
		return json({ message: 'Username and password are required.' }, { status: 400 });
	}

	try {
		const { accessToken, user } = await loginCartomaniaUserAccount(username, password);
		const resolvedUser = await fetchAuthenticatedCartomaniaUserProfile(accessToken).catch(() => user);
		setCartomaniaSessionCookie(cookies, { token: accessToken, user: resolvedUser });
		return json({ user: resolvedUser });
	} catch (error) {
		if (error instanceof CartomaniaApiError) {
			return json(
				{ message: error.bodyText || 'Authentication failed.' },
				{ status: error.status }
			);
		}
		return json({ message: 'Authentication failed.' }, { status: 500 });
	}
};
