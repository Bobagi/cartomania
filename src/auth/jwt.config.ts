/**
 * Resolve the JWT signing secret, FAIL-CLOSED.
 *
 * The old code fell back to a hard-coded `'dev-secret'` when JWT_SECRET was unset.
 * Because this repo is public, that let anyone forge a token with `role: ADMIN`
 * and take over any account. Now the secret MUST be provided and non-trivial:
 *  - in production the process refuses to boot without a strong JWT_SECRET;
 *  - a short/weak/known value is rejected too.
 */
export function resolveJwtSecret(): string {
  const secret = (process.env.JWT_SECRET ?? '').trim();
  const isProd = process.env.NODE_ENV === 'production';
  const weak =
    secret.length < 32 || secret === 'dev-secret' || secret === 'changeme';

  if (weak) {
    if (isProd) {
      throw new Error(
        'JWT_SECRET is missing or too weak. Set a strong random value (>= 32 chars) in the environment.',
      );
    }
    // Non-production: allow a clearly-marked ephemeral dev secret so local dev
    // still runs, but never the guessable literal that leaked in the repo.
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] JWT_SECRET missing/weak - using an ephemeral dev secret (NOT for production).',
    );
    return `dev-ephemeral-${process.pid}-${Date.now()}`;
  }
  return secret;
}
