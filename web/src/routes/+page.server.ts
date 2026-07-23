import type { PageServerLoad } from './$types';
import {
	checkCartomaniaHealthStatus,
	fetchCartomaniaCardCatalog,
	fetchMyCartomaniaGameStatistics,
	listAllActiveCartomaniaGames,
	listAuthenticatedCartomaniaPlayerActiveGames
} from '$lib/server/cartomania/client';
import { loadCartomaniaDashboardDataForUser } from '$lib/services/cartomaniaDashboardDataService';
import {
	countCatalogCards,
	selectFeaturedHeroCards,
	selectShowcaseCards,
	type FeaturedHeroCard
} from '$lib/services/featuredHeroCards';

interface LandingCardShowcase {
	featuredCards: FeaturedHeroCard[];
	showcaseCards: FeaturedHeroCard[];
	collectionCardCount: number;
}

const EMPTY_SHOWCASE: LandingCardShowcase = {
	featuredCards: [],
	showcaseCards: [],
	collectionCardCount: 0
};

/**
 * One catalog fetch feeds every card surface on the logged-out landing: the hero
 * trio, the collection strip below it, and the real card count it quotes.
 */
async function loadLandingCardShowcaseSafely(): Promise<LandingCardShowcase> {
	try {
		const collections = await fetchCartomaniaCardCatalog();
		const featuredCards = selectFeaturedHeroCards(collections);
		return {
			featuredCards,
			showcaseCards: selectShowcaseCards(
				collections,
				featuredCards.map((card) => card.code)
			),
			collectionCardCount: countCatalogCards(collections)
		};
	} catch (error) {
		console.error('Failed to load landing card showcase', error);
		return EMPTY_SHOWCASE;
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

	// Only the logged-out landing renders cards, so skip the extra catalog fetch
	// entirely once a player is signed in.
	const showcase = session?.user ? EMPTY_SHOWCASE : await loadLandingCardShowcaseSafely();

	return {
		authUser: session?.user ?? null,
		dashboard,
		...showcase
	};
};
