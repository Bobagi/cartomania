import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Google OAuth callback (scaffold — NOT yet functional).
 *
 * To finish Google sign-in, implement the following here:
 *   1. Verify the `state` query param against the cookie set in /auth/google (CSRF).
 *   2. Exchange `url.searchParams.get('code')` for tokens via a POST to
 *      https://oauth2.googleapis.com/token (needs GOOGLE_CLIENT_SECRET +
 *      GOOGLE_REDIRECT_URI).
 *   3. Verify the returned `id_token` and read the Google `sub` + `email`.
 *   4. Call a (new) backend endpoint that finds-or-creates a Player for that
 *      Google identity and returns a Cartomania access token + user. This needs a
 *      `googleId` / `email` column on the Player model (Prisma migration).
 *   5. setCartomaniaSessionCookie(cookies, { token, user }) — see
 *      $lib/server/auth/cookies — then redirect to '/'.
 */
export const GET: RequestHandler = ({ url }) => {
	const oauthError = url.searchParams.get('error');
	// Until the steps above are wired up, just return to the home page.
	throw redirect(303, oauthError ? '/?googleAuth=denied' : '/?googleAuth=todo');
};
