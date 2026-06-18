import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	authUser: locals.cartomaniaSession?.user ?? null,
	locale: locals.locale
});
