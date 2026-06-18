import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';
import { writable } from 'svelte/store';

export const authUser = writable<AuthenticatedCartomaniaUser | null>(null);

export function setAuthState(user: AuthenticatedCartomaniaUser | null) {
	authUser.set(user);
}

export function clearAuthState() {
	setAuthState(null);
}
