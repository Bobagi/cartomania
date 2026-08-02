import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchAuthenticatedCartomaniaUserProfile } from '$lib/server/cartomania/client';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.cartomaniaSession;
	if (!session?.user) throw redirect(302, '/');
	// Fetch fresh so email/verification/googleLinked reflect the latest state.
	const user = await fetchAuthenticatedCartomaniaUserProfile(session.token).catch(
		() => session.user
	);
	return { user };
};
