import type { Card } from '$lib/api/cartomaniaTypes';

export function normalizeHeadersInitToObject(headersInit?: HeadersInit): Record<string, string> {
	if (!headersInit) {
		return {};
	}
	if (headersInit instanceof Headers) {
		return Object.fromEntries(headersInit.entries());
	}
	if (Array.isArray(headersInit)) {
		return Object.fromEntries(headersInit);
	}
	return { ...headersInit };
}

export function ensureJsonContentType(
	headers: Record<string, string>,
	body: RequestInit['body']
): void {
	const hasBody = body !== null && body !== undefined;
	if (!hasBody) {
		return;
	}

	const headerNames = Object.keys(headers);
	const hasContentTypeHeader = headerNames.some(
		(headerName) => headerName.toLowerCase() === 'content-type'
	);

	if (!hasContentTypeHeader) {
		headers['Content-Type'] = 'application/json';
	}
}

export class CartomaniaApiError extends Error {
	readonly status: number;
	readonly method: string;
	readonly path: string;
	readonly bodyText: string;
	readonly bodyJson: unknown | undefined;

	constructor(args: {
		status: number;
		method: string;
		path: string;
		bodyText: string;
		bodyJson?: unknown;
	}) {
		const { status, method, path, bodyText, bodyJson } = args;
		const bodyMessage =
			typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
				? String((bodyJson as { message: unknown }).message ?? '').trim()
				: '';
		const summary = bodyMessage || bodyText.trim();
		super(`${method} ${path} → ${status}` + (summary ? ` ${summary}` : ''));
		this.name = 'CartomaniaApiError';
		this.status = status;
		this.method = method;
		this.path = path;
		this.bodyText = bodyText;
		this.bodyJson = bodyJson;
	}
}

export type CartomaniaRawCardMetadata = {
	number?: number | string | null;
} | null;

export type CartomaniaRawCardPayload = {
	code: string;
	name: string;
	description?: string | null;
	imageUrl: string;
	damage?: number | null;
	heal?: number | null;
	fire?: number | null;
	might?: number | null;
	magic?: number | null;
	number?: number | string | null;
	cardNumber?: number | string | null;
	cornerNumber?: number | string | null;
	meta?: CartomaniaRawCardMetadata;
	metadata?: CartomaniaRawCardMetadata;
	no?: number | string | null;
	idx?: number | string | null;
	id?: number | string | null;
};

export function resolveCardNumberFromCartomaniaRawCardPayload(
	rawCartomaniaCard: CartomaniaRawCardPayload
): number {
	const possibleValues: Array<number | string | null | undefined> = [
		rawCartomaniaCard.number,
		rawCartomaniaCard.cardNumber,
		rawCartomaniaCard.cornerNumber,
		rawCartomaniaCard.meta?.number,
		rawCartomaniaCard.metadata?.number,
		rawCartomaniaCard.no,
		rawCartomaniaCard.idx,
		rawCartomaniaCard.id
	];
	for (const value of possibleValues) {
		if (value === null || value === undefined) {
			continue;
		}
		const parsedNumber = typeof value === 'number' ? value : Number(value);
		if (!Number.isNaN(parsedNumber)) {
			return parsedNumber;
		}
	}
	return 0;
}

export function convertCartomaniaRawCardPayloadToCard(rawCartomaniaCard: CartomaniaRawCardPayload): Card {
	return {
		code: rawCartomaniaCard.code,
		name: rawCartomaniaCard.name,
		description: rawCartomaniaCard.description ?? '',
		image: rawCartomaniaCard.imageUrl,
		damage: rawCartomaniaCard.damage ?? 0,
		heal: rawCartomaniaCard.heal ?? 0,
		fire: rawCartomaniaCard.fire ?? 0,
		might: rawCartomaniaCard.might ?? 0,
		magic: rawCartomaniaCard.magic ?? 0,
		number: resolveCardNumberFromCartomaniaRawCardPayload(rawCartomaniaCard)
	};
}
