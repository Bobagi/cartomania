import { error } from '@sveltejs/kit';
import { getCartomaniaBaseUrl } from '$lib/server/cartomania/client';

/** Require an authenticated session, returning its backend token (or 401). */
export function requireSessionToken(locals: App.Locals): string {
	const token = locals.cartomaniaSession?.token;
	if (!token) throw error(401, 'Not authenticated');
	return token;
}

/**
 * Call an authenticated backend endpoint on behalf of the current session.
 * Surfaces the backend's error message with its status code.
 */
export async function callBackendAuthed(
	token: string,
	path: string,
	method: string,
	body?: unknown
): Promise<unknown> {
	const response = await fetch(`${getCartomaniaBaseUrl()}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
		},
		body: body !== undefined ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		let message = 'Request failed';
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed?.message === 'string') message = parsed.message;
			else if (Array.isArray(parsed?.message)) message = parsed.message.join(', ');
		} catch {
			if (text) message = text;
		}
		throw error(response.status, message);
	}

	const text = await response.text();
	return text ? JSON.parse(text) : null;
}
