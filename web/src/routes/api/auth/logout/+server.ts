import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearCartomaniaSessionCookie } from '$lib/server/auth/cookies';

export const POST: RequestHandler = async ({ cookies }) => {
	clearCartomaniaSessionCookie(cookies);
	return json({ success: true });
};
