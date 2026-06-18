import type { AuthenticatedCartomaniaUser } from '../types/cartomania';

export interface CartomaniaAuthenticationDependencies {
	loginCartomaniaUserAccount: (
		username: string,
		password: string
	) => Promise<{
		accessToken: string;
		user: AuthenticatedCartomaniaUser;
	}>;
	fetchAuthenticatedCartomaniaUserProfile: (token: string) => Promise<AuthenticatedCartomaniaUser>;
	storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

export async function authenticateCartomaniaUser(
	username: string,
	password: string,
	dependencies: CartomaniaAuthenticationDependencies
): Promise<{ token: string; user: AuthenticatedCartomaniaUser }> {
	const trimmedUsername = username.trim();
	if (!trimmedUsername || !password) {
		throw new Error('Username and password are required to authenticate');
	}
	const authenticationResponse = await dependencies.loginCartomaniaUserAccount(
		trimmedUsername,
		password
	);
	dependencies.storage?.setItem('token', authenticationResponse.accessToken);
	return {
		token: authenticationResponse.accessToken,
		user: authenticationResponse.user
	};
}

export async function restoreCartomaniaAuthentication(
	dependencies: CartomaniaAuthenticationDependencies
): Promise<{ token: string | null; user: AuthenticatedCartomaniaUser | null }> {
	const token = dependencies.storage?.getItem('token') ?? null;
	if (!token) {
		return { token: null, user: null };
	}
	try {
		const user = await dependencies.fetchAuthenticatedCartomaniaUserProfile(token);
		return { token, user };
	} catch (error) {
		dependencies.storage?.removeItem('token');
		console.error('Failed to restore authentication state', error);
		return { token: null, user: null };
	}
}

export function clearCartomaniaAuthenticationState(
	dependencies: CartomaniaAuthenticationDependencies
): void {
	dependencies.storage?.removeItem('token');
}
