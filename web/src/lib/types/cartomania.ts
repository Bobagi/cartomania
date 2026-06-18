export type CartomaniaUserRole = 'USER' | 'ADMIN';

export interface AuthenticatedCartomaniaUser {
	id: string;
	username: string;
	role: CartomaniaUserRole;
	avatarUrl?: string | null;
}

export interface CartomaniaGameStatistics {
	gamesPlayed: number;
	gamesWon: number;
	gamesDrawn: number;
}

export interface CartomaniaGameSummaryWithMetadata {
	id: string;
	gameId: string;
	playerAId: string;
	playerBId: string;
	players: string[];
	lastActivity: number;
	mode: string;
}

export interface CartomaniaDashboardData {
	backendHealthMessage: string;
	myActiveCartomaniaGames: CartomaniaGameSummaryWithMetadata[];
	allActiveCartomaniaGames: CartomaniaGameSummaryWithMetadata[];
	statistics: CartomaniaGameStatistics;
}
