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
/** How many cards the landing's collection strip previews. */
const SHOWCASE_CARD_COUNT = 8;

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

/** Total number of cards in the catalog — the landing quotes it as real proof. */
export function countCatalogCards(collections: CartomaniaCardCollection[]): number {
	return collections.reduce((total, collection) => total + (collection.cards?.length ?? 0), 0);
}

/**
 * Picks the cards previewed in the landing's collection strip. It deliberately
 * skips the ones already standing in the hero (no duplicates on one screen) and
 * walks the catalog with an even stride so the strip samples the whole
 * collection instead of showing the first N cards.
 */
export function selectShowcaseCards(
	collections: CartomaniaCardCollection[],
	excludeCodes: string[] = [],
	count: number = SHOWCASE_CARD_COUNT
): FeaturedHeroCard[] {
	const excluded = new Set(excludeCodes);
	const available = collections
		.flatMap((collection) => collection.cards ?? [])
		.filter((card) => !excluded.has(card.code));
	if (available.length === 0) return [];

	const stride = Math.max(1, Math.floor(available.length / count));
	const chosen: FeaturedHeroCard[] = [];
	for (let index = 0; index < available.length && chosen.length < count; index += stride) {
		chosen.push(toFeaturedHeroCard(available[index]));
	}
	return chosen;
}
