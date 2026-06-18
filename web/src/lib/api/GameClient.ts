import { createCartomaniaClient } from '$lib/api/cartomaniaClientFactory';
import {
	CartomaniaApiError,
	ensureJsonContentType,
	normalizeHeadersInitToObject
} from '$lib/api/cartomaniaCommon';

export type {
	Card,
	CartomaniaCardCatalogItem,
	CartomaniaCardCollection,
	CartomaniaFriendChatHistory,
	CartomaniaFriendChatMessage,
	CartomaniaFriendSummary,
	CartomaniaIncomingFriendRequest,
	CartomaniaPlayerSummary,
	GameMode,
	GameResult,
	GameSummary,
	GameState,
	CartomaniaRawCardPayload as CartomaniaRawCard
} from '$lib/api/cartomaniaClientFactory';
export { CartomaniaApiError } from '$lib/api/cartomaniaCommon';

const CARTOMANIA_CARTOMANIA_PROXY_BASE_PATH = '/api/cartomania';

function buildCartomaniaProxyUrl(path: string): string {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${CARTOMANIA_CARTOMANIA_PROXY_BASE_PATH}${normalizedPath}`;
}

async function performCartomaniaApiRequest(
	path: string,
	init: RequestInit = {},
	_token?: string
): Promise<Response> {
	const url = buildCartomaniaProxyUrl(path);
	const combinedHeaders = normalizeHeadersInitToObject(init.headers);
	const method = String(init.method ?? 'GET').toUpperCase();
	ensureJsonContentType(combinedHeaders, init.body);
	return fetch(url, { ...init, headers: combinedHeaders, method });
}

async function performCartomaniaApiRequestReturningJson<T = unknown>(
	path: string,
	init: RequestInit = {},
	token?: string
): Promise<T> {
	const response = await performCartomaniaApiRequest(path, init, token);

	if (!response.ok) {
		let bodyText = '';
		try {
			bodyText = await response.text();
		} catch {
			bodyText = '';
		}

		let bodyJson: unknown | undefined;
		if (bodyText) {
			try {
				bodyJson = JSON.parse(bodyText);
			} catch {
				bodyJson = undefined;
			}
		}

		const method = String(init.method ?? 'GET').toUpperCase();

		throw new CartomaniaApiError({
			status: response.status,
			method,
			path,
			bodyText,
			bodyJson
		});
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return (await response.json()) as T;
	}
	return null as unknown as T;
}

const cartomaniaClient = createCartomaniaClient({
	rawFetch: performCartomaniaApiRequest,
	requestJson: performCartomaniaApiRequestReturningJson
});

const {
	checkCartomaniaHealthStatus,
	registerCartomaniaUserAccount,
	fetchAuthenticatedCartomaniaUserProfile,
	startClassicCartomaniaGameForPlayer,
	startAttributeDuelCartomaniaGameForPlayer,
	startCartomaniaGameWithAutomaticModeSelection,
	endCartomaniaGameSessionOnServer,
	startCartomaniaGameWithFriend,
	surrenderCartomaniaGame,
	fetchCartomaniaGameStateById,
	fetchCartomaniaGameResult,
	playCardInCartomaniaGame,
	skipCartomaniaGameTurn,
	chooseCartomaniaDuelCard,
	chooseCartomaniaDuelAttribute,
	unchooseCartomaniaDuelCard,
	advanceCartomaniaDuel,
	fetchCartomaniaCardMetadata,
	fetchMultipleCartomaniaCardMetadata,
	listAuthenticatedCartomaniaPlayerActiveGames,
	listAllActiveCartomaniaGames,
	expireInactiveCartomaniaGames,
	fetchMyCartomaniaGameStatistics,
	fetchCartomaniaCardCatalog,
	searchCartomaniaPlayers,
	listCartomaniaFriends,
	listCartomaniaFriendRequests,
	sendCartomaniaFriendRequest,
	respondCartomaniaFriendRequest,
	removeCartomaniaFriend,
	blockCartomaniaPlayer,
	fetchCartomaniaFriendChat,
	sendCartomaniaFriendMessage
} = cartomaniaClient;

export {
	checkCartomaniaHealthStatus,
	registerCartomaniaUserAccount,
	fetchAuthenticatedCartomaniaUserProfile,
	startClassicCartomaniaGameForPlayer,
	startAttributeDuelCartomaniaGameForPlayer,
	startCartomaniaGameWithAutomaticModeSelection,
	endCartomaniaGameSessionOnServer,
	startCartomaniaGameWithFriend,
	surrenderCartomaniaGame,
	fetchCartomaniaGameStateById,
	fetchCartomaniaGameResult,
	playCardInCartomaniaGame,
	skipCartomaniaGameTurn,
	chooseCartomaniaDuelCard,
	chooseCartomaniaDuelAttribute,
	unchooseCartomaniaDuelCard,
	advanceCartomaniaDuel,
	fetchCartomaniaCardMetadata,
	fetchMultipleCartomaniaCardMetadata,
	listAuthenticatedCartomaniaPlayerActiveGames,
	listAllActiveCartomaniaGames,
	expireInactiveCartomaniaGames,
	fetchMyCartomaniaGameStatistics,
	fetchCartomaniaCardCatalog,
	searchCartomaniaPlayers,
	listCartomaniaFriends,
	listCartomaniaFriendRequests,
	sendCartomaniaFriendRequest,
	respondCartomaniaFriendRequest,
	removeCartomaniaFriend,
	blockCartomaniaPlayer,
	fetchCartomaniaFriendChat,
	sendCartomaniaFriendMessage
};

export async function loginCartomaniaUserAccount(
	username: string,
	password: string
): Promise<{ user: { id: string; username: string; role: 'USER' | 'ADMIN' } }> {
	const response = await fetch('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});

	if (!response.ok) {
		let message = 'Authentication failed.';
		try {
			const body = await response.json();
			if (typeof body?.message === 'string' && body.message.trim()) {
				message = body.message.trim();
			}
		} catch {
			// ignore JSON parse errors
		}
		throw new CartomaniaApiError({
			status: response.status,
			method: 'POST',
			path: '/api/auth/login',
			bodyText: message,
			bodyJson: undefined
		});
	}

	return (await response.json()) as {
		user: { id: string; username: string; role: 'USER' | 'ADMIN' };
	};
}

export async function fetchCartomaniaProxy(path: string, init?: RequestInit): Promise<Response> {
	return fetch(buildCartomaniaProxyUrl(path), init);
}
