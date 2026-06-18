import type { CartomaniaGameSummaryWithMetadata } from '../types/cartomania';

export function determineIfGameBelongsToPlayer(
	gameSummary: CartomaniaGameSummaryWithMetadata,
	playerIdentifier: string
): boolean {
	if (!playerIdentifier) return false;
	if (Array.isArray(gameSummary?.players)) {
		return gameSummary.players.includes(playerIdentifier);
	}
	const normalizedPlayerIdentifier = playerIdentifier.trim();
	return (
		gameSummary?.playerAId === normalizedPlayerIdentifier ||
		gameSummary?.playerBId === normalizedPlayerIdentifier
	);
}

export function resolveCartomaniaGameIdentifier(gameSummary: CartomaniaGameSummaryWithMetadata): string {
	return (
		gameSummary.id ??
		gameSummary.gameId ??
		(gameSummary as { gameIdentifier?: string }).gameIdentifier ??
		''
	);
}

export function extractLastActivityTimestamp(
	gameSummary: CartomaniaGameSummaryWithMetadata
): number | null {
	return typeof gameSummary?.lastActivity === 'number' ? gameSummary.lastActivity : null;
}

export function formatRelativeLastActivity(timestamp: number | null): string {
	if (!timestamp) return '—';
	const elapsedMilliseconds = Date.now() - timestamp;
	const elapsedMinutes = Math.round(elapsedMilliseconds / 60000);
	if (elapsedMinutes < 1) return 'just now';
	if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
	const elapsedHours = Math.round(elapsedMinutes / 60);
	return `${elapsedHours}h ago`;
}
