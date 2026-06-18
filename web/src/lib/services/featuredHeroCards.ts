import type { CartomaniaCardCatalogItem, CartomaniaCardCollection } from '$lib/api/cartomaniaTypes';

/** Minimal card shape the logged-out landing hero needs to render a real CardComposite. */
export interface FeaturedHeroCard {
	code: string;
	name: string;
	imageUrl: string;
	description: string;
	magic: number;
	might: number;
	fire: number;
	number: number;
}

/** Hand-picked card numbers shown in the hero fan: [left, center, right]. */
const DEFAULT_FEATURED_CARD_NUMBERS = [3, 1, 8];
const FEATURED_HERO_CARD_COUNT = 3;

function toFeaturedHeroCard(card: CartomaniaCardCatalogItem): FeaturedHeroCard {
	return {
		code: card.code,
		name: card.name ?? card.code,
		imageUrl: card.imageUrl ?? card.image ?? '',
		description: card.description ?? '',
		magic: card.magic ?? 0,
		might: card.might ?? 0,
		fire: card.fire ?? 0,
		number: card.number ?? 0
	};
}

/**
 * Picks the cards shown in the logged-out landing hero. It prefers a curated set
 * of card numbers (so the hero keeps its hand-picked look) and then fills any
 * remaining slots from the catalog order, never repeating a card.
 */
export function selectFeaturedHeroCards(
	collections: CartomaniaCardCollection[],
	preferredCardNumbers: number[] = DEFAULT_FEATURED_CARD_NUMBERS
): FeaturedHeroCard[] {
	const allCards = collections.flatMap((collection) => collection.cards ?? []);
	if (allCards.length === 0) return [];

	const chosen: FeaturedHeroCard[] = [];
	const usedCodes = new Set<string>();

	const take = (card: CartomaniaCardCatalogItem | undefined) => {
		if (!card || usedCodes.has(card.code) || chosen.length >= FEATURED_HERO_CARD_COUNT) return;
		usedCodes.add(card.code);
		chosen.push(toFeaturedHeroCard(card));
	};

	for (const cardNumber of preferredCardNumbers) {
		take(allCards.find((card) => card.number === cardNumber));
	}
	for (const card of allCards) {
		if (chosen.length >= FEATURED_HERO_CARD_COUNT) break;
		take(card);
	}

	return chosen;
}
