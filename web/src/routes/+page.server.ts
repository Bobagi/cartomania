import type { PageServerLoad } from './$types';
import {
	checkCartomaniaHealthStatus,
	fetchCartomaniaCardCatalog,
	fetchMyCartomaniaGameStatistics,
	listAllActiveCartomaniaGames,
	listAuthenticatedCartomaniaPlayerActiveGames
} from '$lib/server/cartomania/client';
import { loadCartomaniaDashboardDataForUser } from '$lib/services/cartomaniaDashboardDataService';
import { selectFeaturedHeroCards, type FeaturedHeroCard } from '$lib/services/featuredHeroCards';

async function loadFeaturedHeroCardsSafely(): Promise<FeaturedHeroCard[]> {
	try {
		const collections = await fetchCartomaniaCardCatalog();
		return selectFeaturedHeroCards(collections);
	} catch (error) {
		console.error('Failed to load featured hero cards', error);
		return [];
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.cartomaniaSession;

	const dashboard = await loadCartomaniaDashboardDataForUser(
		session?.token ?? null,
		session?.user ?? null,
		{
			checkCartomaniaHealthStatus,
			listAllActiveCartomaniaGames,
			listAuthenticatedCartomaniaPlayerActiveGames,
			fetchMyCartomaniaGameStatistics
		}
	);

	// Only the logged-out landing hero renders the featured cards, so skip the
	// extra catalog fetch entirely once a player is signed in.
	const featuredCards = session?.user ? [] : await loadFeaturedHeroCardsSafely();

	return {
		authUser: session?.user ?? null,
		dashboard,
		featuredCards
	};
};
