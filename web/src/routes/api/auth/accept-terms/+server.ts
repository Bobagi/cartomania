import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { acceptCartomaniaAgreement, CartomaniaApiError } from '$lib/server/cartomania/client';

function forwardedContextHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
	if (ip) headers['x-real-ip'] = ip;
	const ua = request.headers.get('user-agent');
	if (ua) headers['user-agent'] = ua;
	return headers;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = locals.cartomaniaSession?.token;
	if (!token) {
		return json({ message: 'Not authenticated.' }, { status: 401 });
	}
	try {
		const result = await acceptCartomaniaAgreement(token, forwardedContextHeaders(request));
		return json(result);
	} catch (error) {
		if (error instanceof CartomaniaApiError) {
			return json({ message: 'Could not record acceptance.' }, { status: error.status });
		}
		return json({ message: 'Could not record acceptance.' }, { status: 500 });
	}
};
