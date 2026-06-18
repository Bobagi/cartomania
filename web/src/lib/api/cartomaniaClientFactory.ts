import type { CartomaniaRawCardPayload } from '$lib/api/cartomaniaCommon';
import { convertCartomaniaRawCardPayloadToCard } from '$lib/api/cartomaniaCommon';
import type {
	Card,
	CartomaniaCardCatalogCollectionInfo,
	CartomaniaCardCatalogItem,
	CartomaniaCardCollection,
	CartomaniaFriendChatHistory,
	CartomaniaFriendChatMessage,
	CartomaniaFriendSummary,
	CartomaniaIncomingFriendRequest,
	CartomaniaPlayerSummary,
	GameMode,
	GameResult,
	GameState,
	GameSummary
} from '$lib/api/cartomaniaTypes';

export interface CartomaniaClientAdapter {
	rawFetch: (path: string, init?: RequestInit, token?: string) => Promise<Response>;
	requestJson: <T>(path: string, init?: RequestInit, token?: string) => Promise<T>;
}

export interface CartomaniaClientOptions {
	friendGamePath?: string;
	respondFriendRequest?: (
		friendshipId: string,
		accept: boolean
	) => { path: string; init?: RequestInit };
	removeFriend?: (friendshipId: string) => { path: string; init?: RequestInit };
}

interface CartomaniaClientInternal extends CartomaniaClientAdapter {
	friendGamePath: string;
	respondFriendRequest: (
		friendshipId: string,
		accept: boolean
	) => { path: string; init?: RequestInit };
	removeFriend: (friendshipId: string) => { path: string; init?: RequestInit };
}

const defaultClientOptions: Pick<
	CartomaniaClientInternal,
	'friendGamePath' | 'respondFriendRequest' | 'removeFriend'
> = {
	// These must match the NestJS friends/game controllers:
	//   POST /game/start-with-friend, POST /friends/request/:id/{accept,reject}, DELETE /friends/:id
	friendGamePath: '/game/start-with-friend',
	respondFriendRequest: (friendshipId, accept) => ({
		path: `/friends/request/${encodeURIComponent(friendshipId)}/${accept ? 'accept' : 'reject'}`,
		init: { method: 'POST' }
	}),
	removeFriend: (friendshipId) => ({
		path: `/friends/${encodeURIComponent(friendshipId)}`,
		init: { method: 'DELETE' }
	})
};

type CartomaniaCardCollectionPayload = Omit<CartomaniaCardCollection, 'name' | 'cards'> & {
	name?: string;
	cards?: CartomaniaCardCatalogItem[];
};

type CartomaniaCardCatalogApiResponse =
	| CartomaniaCardCollectionPayload[]
	| CartomaniaCardCatalogItem[]
	| {
			collections?: CartomaniaCardCollectionPayload[];
			cards?: CartomaniaCardCatalogItem[];
	  }
	| unknown;

type CartomaniaCardCollectionsApiResponse =
	| CartomaniaCardCollectionPayload[]
	| { collections?: CartomaniaCardCollectionPayload[] }
	| null
	| undefined;

function isCartomaniaCardCatalogItem(candidate: unknown): candidate is CartomaniaCardCatalogItem {
	if (typeof candidate !== 'object' || candidate === null) {
		return false;
	}
	const maybeCard = candidate as Partial<CartomaniaCardCatalogItem>;
	return typeof maybeCard.code === 'string' && typeof maybeCard.name === 'string';
}

function normalizeCartomaniaCardCatalogItem(card: CartomaniaCardCatalogItem): CartomaniaCardCatalogItem {
	const rawNumber = (card as { number?: number | string }).number;
	const normalizedNumber = Number(rawNumber ?? 0);
	return {
		...card,
		number: Number.isFinite(normalizedNumber) ? normalizedNumber : 0,
		imageUrl: card.image ?? card.imageUrl ?? ''
	};
}

function normalizeCartomaniaCardCollectionPayload(
	collection: CartomaniaCardCollectionPayload,
	index: number
): CartomaniaCardCollection {
	const cards = Array.isArray(collection.cards) ? collection.cards : [];
	const normalizedCards = cards.map(normalizeCartomaniaCardCatalogItem);
	const slug = collection.slug ?? collection.id ?? `collection-${index + 1}`;
	const name = collection.name ?? collection.slug ?? collection.id ?? `Collection ${index + 1}`;
	return {
		id: collection.id ?? slug,
		slug,
		name,
		description: collection.description ?? null,
		manufacturer: collection.manufacturer ?? null,
		releaseDate: collection.releaseDate ?? null,
		totalCards: collection.totalCards ?? normalizedCards.length,
		imageUrl: collection.imageUrl ?? null,
		cards: normalizedCards
	};
}

function groupCartomaniaCardsIntoCollections(
	cards: CartomaniaCardCatalogItem[]
): CartomaniaCardCollection[] {
	if (!cards.length) {
		return [];
	}
	const groups = new Map<string, CartomaniaCardCollection>();
	cards.forEach((rawCard, index) => {
		const normalizedCard = normalizeCartomaniaCardCatalogItem(rawCard);
		const fallbackKey = `collection-${index + 1}`;
		const collectionInfo = normalizedCard.collection ?? null;
		const key =
			collectionInfo?.slug ??
			normalizedCard.collectionSlug ??
			normalizedCard.collectionId ??
			collectionInfo?.name?.toLowerCase().replace(/\s+/g, '-') ??
			'card-catalog';
		const resolvedKey = key || fallbackKey;
		const existing = groups.get(resolvedKey);
		if (existing) {
			existing.cards = [...existing.cards, normalizedCard];
			return;
		}
		const resolvedName =
			collectionInfo?.name ??
			normalizedCard.collectionName ??
			normalizedCard.collectionSlug ??
			normalizedCard.collectionId ??
			'Card Catalog';
		groups.set(resolvedKey, {
			id: collectionInfo?.id ?? normalizedCard.collectionId ?? resolvedKey,
			slug: collectionInfo?.slug ?? normalizedCard.collectionSlug ?? resolvedKey,
			name: resolvedName,
			description: collectionInfo?.description ?? null,
			manufacturer: collectionInfo?.manufacturer ?? null,
			releaseDate: collectionInfo?.releaseDate ?? null,
			totalCards: collectionInfo?.totalCards ?? null,
			imageUrl: collectionInfo?.imageUrl ?? normalizedCard.collectionImageUrl ?? null,
			cards: [normalizedCard]
		});
	});
	return Array.from(groups.values()).map((collection, idx) => ({
		...collection,
		id: collection.id ?? collection.slug ?? `collection-${idx + 1}`,
		slug: collection.slug ?? collection.id ?? `collection-${idx + 1}`,
		name: collection.name || collection.slug || `Collection ${idx + 1}`,
		totalCards: collection.totalCards ?? collection.cards.length,
		cards: [...collection.cards]
	}));
}

function normalizeCartomaniaCardCatalogResponse(
	data: CartomaniaCardCatalogApiResponse
): CartomaniaCardCollection[] {
	if (Array.isArray(data)) {
		if (data.every((entry) => typeof entry === 'object' && entry !== null && 'cards' in entry)) {
			return (data as CartomaniaCardCollectionPayload[]).map((entry, index) =>
				normalizeCartomaniaCardCollectionPayload(entry, index)
			);
		}
		if (data.every(isCartomaniaCardCatalogItem)) {
			return groupCartomaniaCardsIntoCollections(data);
		}
	}
	if (typeof data === 'object' && data !== null) {
		const withCollections = data as { collections?: CartomaniaCardCollectionPayload[] };
		if (Array.isArray(withCollections.collections)) {
			return withCollections.collections.map((entry, index) =>
				normalizeCartomaniaCardCollectionPayload(entry, index)
			);
		}
		const withCards = data as { cards?: CartomaniaCardCatalogItem[] };
		if (Array.isArray(withCards.cards) && withCards.cards.every(isCartomaniaCardCatalogItem)) {
			return groupCartomaniaCardsIntoCollections(withCards.cards);
		}
	}
	return [];
}

function normalizeCartomaniaCardCollectionsListResponse(
	data: CartomaniaCardCollectionsApiResponse
): CartomaniaCardCollection[] {
	if (Array.isArray(data)) {
		return data.map((entry, index) => normalizeCartomaniaCardCollectionPayload(entry, index));
	}
	if (typeof data === 'object' && data !== null) {
		const withCollections = data as { collections?: CartomaniaCardCollectionPayload[] };
		if (Array.isArray(withCollections.collections)) {
			return withCollections.collections.map((entry, index) =>
				normalizeCartomaniaCardCollectionPayload(entry, index)
			);
		}
	}
	return [];
}

function buildCollectionInfoFromCartomaniaCollection(
	collection: CartomaniaCardCollection
): CartomaniaCardCatalogCollectionInfo {
	return {
		id: collection.id,
		slug: collection.slug,
		name: collection.name,
		description: collection.description ?? null,
		manufacturer: collection.manufacturer ?? null,
		releaseDate: collection.releaseDate ?? null,
		totalCards: collection.totalCards ?? null,
		imageUrl: collection.imageUrl ?? null
	};
}

function attachCollectionInfoToCartomaniaCard(
	card: CartomaniaCardCatalogItem,
	collection: CartomaniaCardCollection
): CartomaniaCardCatalogItem {
	const normalizedCard = normalizeCartomaniaCardCatalogItem(card);
	const resolvedCollectionInfo =
		normalizedCard.collection ?? buildCollectionInfoFromCartomaniaCollection(collection);
	return {
		...normalizedCard,
		collectionId: normalizedCard.collectionId ?? collection.id ?? undefined,
		collectionSlug: normalizedCard.collectionSlug ?? collection.slug ?? undefined,
		collectionName: normalizedCard.collectionName ?? collection.name,
		collectionImageUrl: normalizedCard.collectionImageUrl ?? collection.imageUrl ?? null,
		collection: resolvedCollectionInfo
	};
}

export interface CartomaniaClient {
	checkCartomaniaHealthStatus: (token?: string) => Promise<string>;
	registerCartomaniaUserAccount: (
		username: string,
		password: string,
		token?: string
	) => Promise<{
		accessToken: string;
		user: { id: string; username: string; role: 'USER' | 'ADMIN' };
	}>;
	fetchAuthenticatedCartomaniaUserProfile: (
		token?: string
	) => Promise<{ id: string; username: string; role: 'USER' | 'ADMIN' }>;
	startClassicCartomaniaGameForPlayer: (
		playerIdentifier: string,
		token?: string
	) => Promise<{ gameId: string }>;
	startAttributeDuelCartomaniaGameForPlayer: (
		playerIdentifier: string,
		token?: string
	) => Promise<{ gameId: string }>;
	startCartomaniaGameWithAutomaticModeSelection: (
		playerIdentifier: string,
		token?: string
	) => Promise<{ gameId: string }>;
	endCartomaniaGameSessionOnServer: (gameIdentifier: string, token?: string) => Promise<unknown>;
	startCartomaniaGameWithFriend: (
		friendId: string,
		mode: GameMode,
		token?: string
	) => Promise<{ gameId: string }>;
	surrenderCartomaniaGame: (gameIdentifier: string, token?: string) => Promise<unknown>;
	fetchCartomaniaGameStateById: (gameIdentifier: string, token?: string) => Promise<GameState | null>;
	fetchCartomaniaGameResult: (gameIdentifier: string, token?: string) => Promise<GameResult>;
	playCardInCartomaniaGame: (
		gameIdentifier: string,
		playerIdentifier: string,
		cardCode: string,
		token?: string
	) => Promise<unknown>;
	skipCartomaniaGameTurn: (
		gameIdentifier: string,
		playerIdentifier: string,
		token?: string
	) => Promise<unknown>;
	chooseCartomaniaDuelCard: (
		gameIdentifier: string,
		playerIdentifier: string,
		cardCode: string,
		token?: string
	) => Promise<unknown>;
	chooseCartomaniaDuelAttribute: (
		gameIdentifier: string,
		playerIdentifier: string,
		attributeCode: string,
		token?: string
	) => Promise<unknown>;
	unchooseCartomaniaDuelCard: (
		gameIdentifier: string,
		playerIdentifier: string,
		cardCode: string,
		token?: string
	) => Promise<unknown>;
	advanceCartomaniaDuel: (gameIdentifier: string, token?: string) => Promise<unknown>;
	fetchCartomaniaCardMetadata: (cardCode: string, token?: string) => Promise<Card>;
	fetchMultipleCartomaniaCardMetadata: (cardCodes: string[], token?: string) => Promise<Card[]>;
	listAuthenticatedCartomaniaPlayerActiveGames: (token?: string) => Promise<GameSummary[]>;
	listAllActiveCartomaniaGames: (token?: string) => Promise<GameSummary[]>;
	expireInactiveCartomaniaGames: (token?: string) => Promise<unknown>;
	fetchMyCartomaniaGameStatistics: (
		token?: string
	) => Promise<{ gamesPlayed: number; gamesWon: number; gamesDrawn: number }>;
	fetchCartomaniaCardCatalog: (token?: string) => Promise<CartomaniaCardCollection[]>;
	searchCartomaniaPlayers: (query: string, token?: string) => Promise<CartomaniaPlayerSummary[]>;
	listCartomaniaFriends: (token?: string) => Promise<CartomaniaFriendSummary[]>;
	listCartomaniaFriendRequests: (token?: string) => Promise<CartomaniaIncomingFriendRequest[]>;
	sendCartomaniaFriendRequest: (targetId: string, token?: string) => Promise<unknown>;
	respondCartomaniaFriendRequest: (
		friendshipId: string,
		accept: boolean,
		token?: string
	) => Promise<unknown>;
	removeCartomaniaFriend: (friendshipId: string, token?: string) => Promise<unknown>;
	blockCartomaniaPlayer: (targetId: string, token?: string) => Promise<unknown>;
	fetchCartomaniaFriendChat: (friendId: string, token?: string) => Promise<CartomaniaFriendChatHistory>;
	sendCartomaniaFriendMessage: (
		friendId: string,
		message: string,
		token?: string
	) => Promise<CartomaniaFriendChatMessage>;
}

export function createCartomaniaClient(
	adapter: CartomaniaClientAdapter,
	options?: CartomaniaClientOptions
): CartomaniaClient {
	const resolvedOptions: CartomaniaClientInternal = {
		rawFetch: adapter.rawFetch,
		requestJson: adapter.requestJson,
		friendGamePath: options?.friendGamePath ?? defaultClientOptions.friendGamePath,
		respondFriendRequest:
			options?.respondFriendRequest ?? defaultClientOptions.respondFriendRequest,
		removeFriend: options?.removeFriend ?? defaultClientOptions.removeFriend
	};
	const { rawFetch, requestJson, friendGamePath, respondFriendRequest, removeFriend } =
		resolvedOptions;
	const cartomaniaCardMetadataCache = new Map<string, Card>();

	async function populateCartomaniaCollectionCards(
		collection: CartomaniaCardCollection,
		token?: string
	): Promise<CartomaniaCardCollection> {
		const identifier = collection.slug ?? collection.id;
		if (!identifier) {
			return collection;
		}
		const cards = await requestJson<CartomaniaCardCatalogItem[]>(
			`/game/collections/${encodeURIComponent(identifier)}/cards`,
			undefined,
			token
		);
		const normalizedCards = cards.map((card) =>
			attachCollectionInfoToCartomaniaCard(card, collection)
		);
		return {
			...collection,
			cards: normalizedCards,
			totalCards: collection.totalCards ?? normalizedCards.length
		};
	}

	async function fetchCartomaniaCollectionsUsingNewEndpoint(
		token?: string
	): Promise<CartomaniaCardCollection[]> {
		try {
			const response = await requestJson<CartomaniaCardCollectionsApiResponse>(
				'/game/collections',
				undefined,
				token
			);
			const normalizedCollections = normalizeCartomaniaCardCollectionsListResponse(response);
			if (!normalizedCollections.length) {
				return [];
			}
			const populationTasks = normalizedCollections.map((collection) =>
				populateCartomaniaCollectionCards(collection, token).catch(() => collection)
			);
			return Promise.all(populationTasks);
		} catch {
			return [];
		}
	}

	async function fetchLegacyCartomaniaCardCatalog(token?: string): Promise<CartomaniaCardCollection[]> {
		const response = await requestJson<CartomaniaCardCatalogApiResponse>(
			'/game/cards',
			undefined,
			token
		);
		return normalizeCartomaniaCardCatalogResponse(response);
	}

	interface CartomaniaHealthStatusResponsePayload {
		status?: string;
		message?: string;
		timestamp?: string;
		uptimeInSeconds?: number;
	}

	function normalizeCartomaniaHealthStatusText(status?: string): string | null {
		if (!status) {
			return null;
		}
		const normalizedStatus = status.trim().toLowerCase();
		return normalizedStatus || null;
	}

	function tryParseCartomaniaHealthStatusPayload(
		bodyText: string
	): CartomaniaHealthStatusResponsePayload | null {
		try {
			const parsed = JSON.parse(bodyText) as CartomaniaHealthStatusResponsePayload;
			if (parsed && typeof parsed === 'object') {
				return parsed;
			}
			return null;
		} catch {
			return null;
		}
	}

	function buildCartomaniaHealthStatusMessage(bodyText: string): string {
		const trimmedText = bodyText.trim();
		if (!trimmedText) {
			return 'Server status unknown';
		}
		const payload = tryParseCartomaniaHealthStatusPayload(trimmedText);
		if (payload) {
			const normalizedStatus = normalizeCartomaniaHealthStatusText(payload.status);
			if (normalizedStatus === 'ok' || normalizedStatus === 'online') {
				return 'online';
			}
			if (normalizedStatus === 'offline') {
				return 'offline';
			}
			if (normalizedStatus === 'degraded') {
				return 'partially online';
			}
			if (normalizedStatus) {
				return `Server status: ${normalizedStatus}`;
			}
			if (payload.message && payload.message.trim()) {
				return payload.message.trim();
			}
		}
		return trimmedText;
	}

	async function checkCartomaniaHealthStatus(token?: string): Promise<string> {
		const response = await rawFetch('/health', undefined, token);
		const bodyText = await response.text();
		if (!response.ok) {
			throw new Error(`Health-check failed: ${response.status}`);
		}
		return buildCartomaniaHealthStatusMessage(bodyText);
	}

	async function fetchCartomaniaGameStateById(
		gameIdentifier: string,
		token?: string
	): Promise<GameState | null> {
		const response = await rawFetch(
			`/game/state/${encodeURIComponent(gameIdentifier)}`,
			undefined,
			token
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch game state: ${response.status}`);
		}
		return (await response.json()) as GameState | null;
	}

	async function fetchCartomaniaCardMetadata(cardCode: string, token?: string): Promise<Card> {
		const cachedCard = cartomaniaCardMetadataCache.get(cardCode);
		if (cachedCard) {
			return cachedCard;
		}

		const normalizedCard = convertCartomaniaRawCardPayloadToCard(
			await requestJson<CartomaniaRawCardPayload>(
				`/game/cards/${encodeURIComponent(cardCode)}`,
				undefined,
				token
			)
		);
		cartomaniaCardMetadataCache.set(cardCode, normalizedCard);
		return normalizedCard;
	}

	async function fetchMultipleCartomaniaCardMetadata(
		cardCodes: string[],
		token?: string
	): Promise<Card[]> {
		const cardCodesMissingFromCache = cardCodes.filter(
			(candidateCode) => !cartomaniaCardMetadataCache.has(candidateCode)
		);
		if (cardCodesMissingFromCache.length > 0) {
			try {
				const rawCards = await requestJson<CartomaniaRawCardPayload[]>(
					`/game/cards?codes=${cardCodesMissingFromCache
						.map((code) => encodeURIComponent(code))
						.join(',')}`,
					undefined,
					token
				);
				for (const rawCard of rawCards) {
					if (rawCard && rawCard.code) {
						cartomaniaCardMetadataCache.set(rawCard.code, convertCartomaniaRawCardPayloadToCard(rawCard));
					}
				}
			} catch {
				const allCards = await requestJson<CartomaniaRawCardPayload[]>(
					'/game/cards',
					undefined,
					token
				);
				for (const missingCode of cardCodesMissingFromCache) {
					const fallbackCard = allCards.find((candidateCard) => candidateCard.code === missingCode);
					if (fallbackCard) {
						cartomaniaCardMetadataCache.set(
							missingCode,
							convertCartomaniaRawCardPayloadToCard(fallbackCard)
						);
					}
				}
			}
		}

		const resolvedCards: Card[] = [];
		for (const cardCode of cardCodes) {
			const cachedCard = cartomaniaCardMetadataCache.get(cardCode);
			if (cachedCard) {
				resolvedCards.push(cachedCard);
			}
		}
		return resolvedCards;
	}

	async function listAuthenticatedCartomaniaPlayerActiveGames(token?: string): Promise<GameSummary[]> {
		const response = await rawFetch('/game/active/mine', undefined, token);
		if (!response.ok) return [];
		return (await response.json()) as GameSummary[];
	}

	return {
		checkCartomaniaHealthStatus,
		registerCartomaniaUserAccount: (username, password, token) =>
			requestJson(
				'/auth/register',
				{
					method: 'POST',
					body: JSON.stringify({ username, password })
				},
				token
			),
		fetchAuthenticatedCartomaniaUserProfile: (token) => requestJson('/auth/me', undefined, token),
		startClassicCartomaniaGameForPlayer: (playerIdentifier, token) =>
			requestJson(
				'/game/start-classic',
				{
					method: 'POST',
					body: JSON.stringify({ playerAId: playerIdentifier })
				},
				token
			),
		startAttributeDuelCartomaniaGameForPlayer: (playerIdentifier, token) =>
			requestJson(
				'/game/start-duel',
				{
					method: 'POST',
					body: JSON.stringify({ playerAId: playerIdentifier })
				},
				token
			),
		startCartomaniaGameWithAutomaticModeSelection: (playerIdentifier, token) =>
			requestJson(
				'/game/start',
				{
					method: 'POST',
					body: JSON.stringify({ playerAId: playerIdentifier })
				},
				token
			),
		endCartomaniaGameSessionOnServer: (gameIdentifier, token) =>
			requestJson(`/game/end/${encodeURIComponent(gameIdentifier)}`, { method: 'DELETE' }, token),
		startCartomaniaGameWithFriend: (friendId, mode, token) =>
			requestJson(
				friendGamePath,
				{
					method: 'POST',
					body: JSON.stringify({ friendId, mode })
				},
				token
			),
		surrenderCartomaniaGame: (gameIdentifier, token) =>
			requestJson(
				'/game/surrender',
				{
					method: 'POST',
					body: JSON.stringify({ gameId: gameIdentifier })
				},
				token
			),
		fetchCartomaniaGameStateById,
		fetchCartomaniaGameResult: (gameIdentifier, token) =>
			requestJson(`/game/result/${encodeURIComponent(gameIdentifier)}`, undefined, token),
		playCardInCartomaniaGame: (gameIdentifier, playerIdentifier, cardCode, token) =>
			requestJson(
				'/game/play-card',
				{
					method: 'POST',
					body: JSON.stringify({
						gameId: gameIdentifier,
						player: playerIdentifier,
						card: cardCode
					})
				},
				token
			),
		skipCartomaniaGameTurn: (gameIdentifier, playerIdentifier, token) =>
			requestJson(
				'/game/skip-turn',
				{
					method: 'POST',
					body: JSON.stringify({ gameId: gameIdentifier, player: playerIdentifier })
				},
				token
			),
		chooseCartomaniaDuelCard: (gameIdentifier, playerIdentifier, cardCode, token) =>
			requestJson(
				`/game/${encodeURIComponent(gameIdentifier)}/duel/choose-card`,
				{
					method: 'POST',
					body: JSON.stringify({ playerId: playerIdentifier, cardCode })
				},
				token
			),
		chooseCartomaniaDuelAttribute: (gameIdentifier, playerIdentifier, attributeCode, token) =>
			requestJson(
				`/game/${encodeURIComponent(gameIdentifier)}/duel/choose-attribute`,
				{
					method: 'POST',
					body: JSON.stringify({ playerId: playerIdentifier, attribute: attributeCode })
				},
				token
			),
		unchooseCartomaniaDuelCard: (gameIdentifier, playerIdentifier, cardCode, token) =>
			requestJson(
				`/game/${encodeURIComponent(gameIdentifier)}/duel/unchoose-card`,
				{
					method: 'POST',
					body: JSON.stringify({ playerId: playerIdentifier, cardCode })
				},
				token
			),
		advanceCartomaniaDuel: (gameIdentifier, token) =>
			requestJson(
				`/game/${encodeURIComponent(gameIdentifier)}/duel/advance`,
				{ method: 'POST' },
				token
			),
		fetchCartomaniaCardMetadata,
		fetchMultipleCartomaniaCardMetadata,
		listAuthenticatedCartomaniaPlayerActiveGames,
		listAllActiveCartomaniaGames: (token) => requestJson('/game/active', undefined, token),
		expireInactiveCartomaniaGames: (token) => requestJson('/game/expire', { method: 'POST' }, token),
		fetchMyCartomaniaGameStatistics: (token) => requestJson('/game/stats/me', undefined, token),
		fetchCartomaniaCardCatalog: async (token) => {
			const collections = await fetchCartomaniaCollectionsUsingNewEndpoint(token);
			if (collections.length > 0) {
				return collections;
			}
			return fetchLegacyCartomaniaCardCatalog(token);
		},
		searchCartomaniaPlayers: (query, token) => {
			const trimmed = query.trim();
			if (!trimmed) return Promise.resolve([]);
			return requestJson(`/friends/search?q=${encodeURIComponent(trimmed)}`, undefined, token);
		},
		listCartomaniaFriends: (token) => requestJson('/friends', undefined, token),
		listCartomaniaFriendRequests: (token) => requestJson('/friends/requests', undefined, token),
		sendCartomaniaFriendRequest: (targetId, token) =>
			requestJson(
				'/friends/request',
				{ method: 'POST', body: JSON.stringify({ targetId }) },
				token
			),
		respondCartomaniaFriendRequest: (friendshipId, accept, token) => {
			const { path, init } = respondFriendRequest(friendshipId, accept);
			return requestJson(path, init, token);
		},
		removeCartomaniaFriend: (friendshipId, token) => {
			const { path, init } = removeFriend(friendshipId);
			return requestJson(path, init, token);
		},
		blockCartomaniaPlayer: (targetId, token) =>
			requestJson(
				'/friends/block',
				{
					method: 'POST',
					body: JSON.stringify({ targetId })
				},
				token
			),
		fetchCartomaniaFriendChat: (friendId, token) =>
			requestJson(`/friends/chat/${encodeURIComponent(friendId)}`, undefined, token),
		sendCartomaniaFriendMessage: (friendId, message, token) =>
			requestJson(
				`/friends/chat/${encodeURIComponent(friendId)}`,
				{
					method: 'POST',
					body: JSON.stringify({ message })
				},
				token
			)
	};
}

export type {
	Card,
	CartomaniaCardCatalogItem,
	CartomaniaCardCollection,
	CartomaniaFriendChatHistory,
	CartomaniaFriendChatMessage,
	CartomaniaFriendSummary,
	CartomaniaIncomingFriendRequest,
	CartomaniaPlayerSummary,
	CartomaniaRawCardPayload,
	GameMode,
	GameResult,
	GameState,
	GameSummary
};
