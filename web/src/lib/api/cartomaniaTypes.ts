import type { Card, GameState } from '$lib/stores/game';

export type { Card, GameState };

export type GameMode = 'CLASSIC' | 'ATTRIBUTE_DUEL';

export interface GameSummary {
	id: string;
	playerAId: string;
	mode: GameMode | string;
	[key: string]: unknown;
}

export interface GameResult {
	winner: string | null;
	log: string[];
}

export interface CartomaniaPlayerSummary {
	id: string;
	username: string;
	avatarUrl?: string | null;
	lastSeenAt?: string | null;
}

export interface CartomaniaFriendSummary {
	friendshipId: string;
	friend: CartomaniaPlayerSummary;
	status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
	blockedByMe: boolean;
}

export interface CartomaniaIncomingFriendRequest {
	friendshipId: string;
	requester: CartomaniaPlayerSummary;
	createdAt: string;
}

export interface CartomaniaFriendChatMessage {
	id: string;
	senderId: string;
	recipientId: string;
	body: string;
	createdAt: string;
}

export interface CartomaniaFriendChatHistory {
	friendshipId: string;
	messages: CartomaniaFriendChatMessage[];
}

export interface CartomaniaCardCatalogCollectionInfo {
	id?: string;
	slug?: string;
	name?: string;
	description?: string | null;
	manufacturer?: string | null;
	releaseDate?: string | null;
	totalCards?: number | null;
	imageUrl?: string | null;
}

export interface CartomaniaCardCatalogItem {
	code: string;
	name: string;
	description: string;
	image?: string;
	imageUrl?: string;
	might: number;
	fire: number;
	magic: number;
	number: number;
	collectionId?: string;
	collectionSlug?: string;
	collectionName?: string;
	collectionImageUrl?: string | null;
	collection?: CartomaniaCardCatalogCollectionInfo;
}

export interface CartomaniaCardCollection extends CartomaniaCardCatalogCollectionInfo {
	name: string;
	cards: CartomaniaCardCatalogItem[];
}
