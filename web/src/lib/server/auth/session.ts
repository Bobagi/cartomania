import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';

export interface CartomaniaSession {
	token: string;
	user: AuthenticatedCartomaniaUser;
}
