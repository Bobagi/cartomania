import type { GameSummary } from '$lib/api/cartomaniaTypes';
import type {
	AuthenticatedCartomaniaUser,
	CartomaniaDashboardData,
	CartomaniaGameStatistics,
	CartomaniaGameSummaryWithMetadata
} from '../types/cartomania';
import { determineIfGameBelongsToPlayer } from './cartomaniaGameSummaryUtils';

export interface CartomaniaDashboardServiceDependencies {
	checkCartomaniaHealthStatus: () => Promise<string>;
	listAllActiveCartomaniaGames: (token: string) => Promise<GameSummary[]>;
	listAuthenticatedCartomaniaPlayerActiveGames: (token: string) => Promise<GameSummary[]>;
	fetchMyCartomaniaGameStatistics: (token: string) => Promise<Partial<CartomaniaGameStatistics>>;
}

export async function loadCartomaniaDashboardDataForUser(
	token: string | null,
	authenticatedUser: AuthenticatedCartomaniaUser | null,
	dependencies: CartomaniaDashboardServiceDependencies
): Promise<CartomaniaDashboardData> {
	const { backendHealthMessage } = await resolveBackendHealthStatus(dependencies);

	if (!token || !authenticatedUser) {
		return createEmptyCartomaniaDashboardData(backendHealthMessage);
	}

	try {
		const { allActiveCartomaniaGames, myActiveCartomaniaGames } = await resolveActiveGameLists(
			token,
			authenticatedUser,
			dependencies
		);
		const statistics = await resolveCartomaniaStatistics(token, dependencies);

		return {
			backendHealthMessage,
			myActiveCartomaniaGames,
			allActiveCartomaniaGames,
			statistics
		};
	} catch (error) {
		console.error('[Cartomania] Failed to load dashboard data', error);
		return createEmptyCartomaniaDashboardData(backendHealthMessage);
	}
}

async function resolveBackendHealthStatus(
	dependencies: CartomaniaDashboardServiceDependencies
): Promise<{ backendHealthMessage: string }> {
	try {
		const backendHealthMessage = await dependencies.checkCartomaniaHealthStatus();
		return { backendHealthMessage };
	} catch (error) {
		console.error('[Cartomania] Backend health check failed', error);
		return { backendHealthMessage: (error as Error).message };
	}
}

type RawGameSummary = Record<string, unknown>;

function toTimestampMillis(value: unknown): number {
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = new Date(value).getTime();
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function toOptionalString(value: unknown): string | null {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const resolved: string[] = [];
	for (const item of value) {
		const stringValue = toOptionalString(item);
		if (stringValue) {
			resolved.push(stringValue);
		}
	}
	return resolved;
}

function convertApiGameSummaryToCartomaniaMetadata(api: GameSummary): CartomaniaGameSummaryWithMetadata {
	const raw = api as RawGameSummary;

	const id =
		toOptionalString(raw.id) ??
		toOptionalString(raw.gameId) ??
		toOptionalString((raw as { gameIdentifier?: unknown }).gameIdentifier);
	if (!id) {
		throw new Error('Invalid GameSummary shape');
	}

	const playersFromPlayers = toStringArray(raw.players);
	const playersFromPlayerIds = toStringArray((raw as { playerIds?: unknown }).playerIds);

	const playerAId =
		toOptionalString(raw.playerAId) ?? playersFromPlayers[0] ?? playersFromPlayerIds[0];
	if (!playerAId) {
		throw new Error('Invalid GameSummary shape');
	}

	const playerBId =
		toOptionalString(raw.playerBId) ?? playersFromPlayers[1] ?? playersFromPlayerIds[1] ?? '';

	const combinedPlayers = [
		...playersFromPlayers,
		...playersFromPlayerIds,
		playerAId,
		playerBId
	].filter(Boolean);
	const players = Array.from(new Set(combinedPlayers));

	const lastActivityCandidate =
		raw.lastActivity ??
		(raw as { updatedAt?: unknown }).updatedAt ??
		(raw as { lastUpdate?: unknown }).lastUpdate ??
		(raw as { lastActivityAt?: unknown }).lastActivityAt ??
		(raw as { createdAt?: unknown }).createdAt;

	const mode = toOptionalString(raw.mode) ?? 'UNKNOWN';

	const gameId =
		toOptionalString(raw.gameId) ??
		toOptionalString((raw as { gameIdentifier?: unknown }).gameIdentifier) ??
		id;

	return {
		id,
		gameId,
		playerAId,
		playerBId,
		players,
		lastActivity: toTimestampMillis(lastActivityCandidate),
		mode
	};
}

async function resolveActiveGameLists(
	token: string,
	authenticatedUser: AuthenticatedCartomaniaUser,
	dependencies: CartomaniaDashboardServiceDependencies
): Promise<{
	myActiveCartomaniaGames: CartomaniaGameSummaryWithMetadata[];
	allActiveCartomaniaGames: CartomaniaGameSummaryWithMetadata[];
}> {
	const isAdmin = authenticatedUser.role === 'ADMIN';
	if (!isAdmin) {
		const myApiGames = await dependencies.listAuthenticatedCartomaniaPlayerActiveGames(token);
		const myActiveCartomaniaGames = myApiGames.map(convertApiGameSummaryToCartomaniaMetadata);
		return { myActiveCartomaniaGames, allActiveCartomaniaGames: [] };
	}

	const allApiGames = await dependencies.listAllActiveCartomaniaGames(token);
	const allActiveCartomaniaGames = allApiGames.map(convertApiGameSummaryToCartomaniaMetadata);
	const myActiveCartomaniaGames = allActiveCartomaniaGames.filter((gameSummary) =>
		determineIfGameBelongsToPlayer(gameSummary, authenticatedUser.id)
	);
	return { myActiveCartomaniaGames, allActiveCartomaniaGames };
}

async function resolveCartomaniaStatistics(
	token: string,
	dependencies: CartomaniaDashboardServiceDependencies
): Promise<CartomaniaGameStatistics> {
	const statisticsResponse = await dependencies.fetchMyCartomaniaGameStatistics(token);
	return {
		gamesPlayed: statisticsResponse.gamesPlayed ?? 0,
		gamesWon: statisticsResponse.gamesWon ?? 0,
		gamesDrawn: statisticsResponse.gamesDrawn ?? 0
	};
}

function createEmptyCartomaniaDashboardData(backendHealthMessage: string): CartomaniaDashboardData {
	return {
		backendHealthMessage,
		myActiveCartomaniaGames: [],
		allActiveCartomaniaGames: [],
		statistics: {
			gamesPlayed: 0,
			gamesWon: 0,
			gamesDrawn: 0
		}
	};
}
