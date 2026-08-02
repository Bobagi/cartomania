import { json } from '@sveltejs/kit';
import { callBackendAuthed, requireSessionToken } from '$lib/server/auth/accountActions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const token = requireSessionToken(locals);
	const result = await callBackendAuthed(token, '/auth/resend-verification', 'POST');
	return json(result ?? { ok: true });
};
