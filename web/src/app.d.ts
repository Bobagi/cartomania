// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Locale } from '$lib/i18n/config';
import type { CartomaniaSession } from '$lib/server/auth/session';
import type { AuthenticatedCartomaniaUser, CartomaniaDashboardData } from '$lib/types/cartomania';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			cartomaniaSession: CartomaniaSession | null;
			locale: Locale;
		}
		interface PageData {
			authUser: AuthenticatedCartomaniaUser | null;
			dashboard?: CartomaniaDashboardData;
			locale?: Locale;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
