import type {
	CartomaniaFriendChatHistory,
	CartomaniaFriendChatMessage,
	CartomaniaFriendSummary,
	CartomaniaIncomingFriendRequest,
	CartomaniaPlayerSummary,
	GameMode,
	GameSummary
} from '$lib/api/cartomaniaClientFactory';
import { createCartomaniaClient } from '$lib/api/cartomaniaClientFactory';
import {
	CartomaniaApiError,
	ensureJsonContentType,
	normalizeHeadersInitToObject
} from '$lib/api/cartomaniaCommon';
export { CartomaniaApiError } from '$lib/api/cartomaniaCommon';

interface CartomaniaRuntimeEnvironment extends ImportMetaEnv {
	VITE_API_BASE_URL?: string;
}

const runtimeEnvironmentVariables = import.meta.env as CartomaniaRuntimeEnvironment;
const DEFAULT_CARTOMANIA_BASE_URL = 'http://localhost:3053';

function resolveCartomaniaBaseUrl(): string {
	const configuredCartomaniaBaseUrl = runtimeEnvironmentVariables.VITE_API_BASE_URL;
	if (typeof configuredCartomaniaBaseUrl === 'string' && configuredCartomaniaBaseUrl.trim().length > 0) {
		return configuredCartomaniaBaseUrl.trim().replace(/\/+$/, '');
	}
	return DEFAULT_CARTOMANIA_BASE_URL;
}

const resolvedCartomaniaBaseUrl = resolveCartomaniaBaseUrl();

export function getCartomaniaBaseUrl(): string {
	return resolvedCartomaniaBaseUrl;
}

function buildCartomaniaApiUrl(path: string): string {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${resolvedCartomaniaBaseUrl}${normalizedPath}`;
}

async function performCartomaniaApiRequest(
	path: string,
	init: RequestInit = {},
	token?: string
): Promise<Response> {
	const url = buildCartomaniaApiUrl(path);
	const combinedHeaders = normalizeHeadersInitToObject(init.headers);
	if (token) {
		combinedHeaders.Authorization = `Bearer ${token}`;
	}
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
	registerCartomaniaUserAccount,
	fetchAuthenticatedCartomaniaUserProfile: baseFetchAuthenticatedCartomaniaUserProfile,
	startClassicCartomaniaGameForPlayer,
	startAttributeDuelCartomaniaGameForPlayer,
	startCartomaniaGameWithAutomaticModeSelection,
	endCartomaniaGameSessionOnServer,
	startCartomaniaGameWithFriend: baseStartCartomaniaGameWithFriend,
	surrenderCartomaniaGame: baseSurrenderCartomaniaGame,
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
	listAuthenticatedCartomaniaPlayerActiveGames: baseListAuthenticatedCartomaniaPlayerActiveGames,
	listAllActiveCartomaniaGames,
	expireInactiveCartomaniaGames,
	fetchMyCartomaniaGameStatistics: baseFetchMyCartomaniaGameStatistics,
	fetchCartomaniaCardCatalog,
	checkCartomaniaHealthStatus: baseCheckCartomaniaHealthStatus,
	searchCartomaniaPlayers: baseSearchCartomaniaPlayers,
	listCartomaniaFriends: baseListCartomaniaFriends,
	listCartomaniaFriendRequests: baseListCartomaniaFriendRequests,
	sendCartomaniaFriendRequest: baseSendCartomaniaFriendRequest,
	respondCartomaniaFriendRequest: baseRespondCartomaniaFriendRequest,
	removeCartomaniaFriend: baseRemoveCartomaniaFriend,
	blockCartomaniaPlayer: baseBlockCartomaniaPlayer,
	fetchCartomaniaFriendChat: baseFetchCartomaniaFriendChat,
	sendCartomaniaFriendMessage: baseSendCartomaniaFriendMessage
} = cartomaniaClient;

export function checkCartomaniaHealthStatus(): Promise<string> {
	return baseCheckCartomaniaHealthStatus();
}

export {
	registerCartomaniaUserAccount,
	startClassicCartomaniaGameForPlayer,
	startAttributeDuelCartomaniaGameForPlayer,
	startCartomaniaGameWithAutomaticModeSelection,
	endCartomaniaGameSessionOnServer,
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
	listAllActiveCartomaniaGames,
	expireInactiveCartomaniaGames,
	fetchCartomaniaCardCatalog
};

export async function loginCartomaniaUserAccount(
	username: string,
	password: string
): Promise<{
	accessToken: string;
	user: { id: string; username: string; role: 'USER' | 'ADMIN' };
}> {
	return performCartomaniaApiRequestReturningJson('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ username, password })
	});
}

export function fetchAuthenticatedCartomaniaUserProfile(
	token: string
): Promise<{ id: string; username: string; role: 'USER' | 'ADMIN' }> {
	return baseFetchAuthenticatedCartomaniaUserProfile(token);
}

export function startCartomaniaGameWithFriend(
	friendIdentifier: string,
	mode: GameMode,
	token: string
): Promise<{ gameId: string }> {
	return baseStartCartomaniaGameWithFriend(friendIdentifier, mode, token);
}

export function surrenderCartomaniaGame(gameIdentifier: string, token: string): Promise<unknown> {
	return baseSurrenderCartomaniaGame(gameIdentifier, token);
}

export function listAuthenticatedCartomaniaPlayerActiveGames(token: string): Promise<GameSummary[]> {
	return baseListAuthenticatedCartomaniaPlayerActiveGames(token);
}

export function fetchMyCartomaniaGameStatistics(
	token: string
): Promise<{ gamesPlayed: number; gamesWon: number; gamesDrawn: number }> {
	return baseFetchMyCartomaniaGameStatistics(token);
}

export function searchCartomaniaPlayers(
	query: string,
	token: string
): Promise<CartomaniaPlayerSummary[]> {
	return baseSearchCartomaniaPlayers(query, token);
}

export function listCartomaniaFriends(token: string): Promise<CartomaniaFriendSummary[]> {
	return baseListCartomaniaFriends(token);
}

export function listCartomaniaFriendRequests(token: string): Promise<CartomaniaIncomingFriendRequest[]> {
	return baseListCartomaniaFriendRequests(token);
}

export function sendCartomaniaFriendRequest(targetId: string, token: string): Promise<unknown> {
	return baseSendCartomaniaFriendRequest(targetId, token);
}

export function respondCartomaniaFriendRequest(
	friendshipId: string,
	accept: boolean,
	token: string
): Promise<unknown> {
	return baseRespondCartomaniaFriendRequest(friendshipId, accept, token);
}

export function removeCartomaniaFriend(friendshipId: string, token: string): Promise<unknown> {
	return baseRemoveCartomaniaFriend(friendshipId, token);
}

export function blockCartomaniaPlayer(targetId: string, token: string): Promise<unknown> {
	return baseBlockCartomaniaPlayer(targetId, token);
}

export function fetchCartomaniaFriendChat(
	friendId: string,
	token: string
): Promise<CartomaniaFriendChatHistory> {
	return baseFetchCartomaniaFriendChat(friendId, token);
}

export function sendCartomaniaFriendMessage(
	friendId: string,
	message: string,
	token: string
): Promise<CartomaniaFriendChatMessage> {
	return baseSendCartomaniaFriendMessage(friendId, message, token);
}
