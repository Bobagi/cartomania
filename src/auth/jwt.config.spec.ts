import { resolveJwtSecret } from './jwt.config';

/**
 * The old code fell back to a hard-coded 'dev-secret' in a PUBLIC repo, letting
 * anyone forge an admin token. These lock the fail-closed behaviour: production
 * must refuse a missing/weak secret, and the known-leaked literal is never valid.
 */
describe('resolveJwtSecret — fail-closed', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => resolveJwtSecret()).toThrow();
  });

  it.each(['dev-secret', 'changeme', 'short'])(
    'throws in production for the weak/known value %p',
    (value) => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = value;
      expect(() => resolveJwtSecret()).toThrow();
    },
  );

  it('accepts a strong secret in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(48);
    expect(resolveJwtSecret()).toBe('a'.repeat(48));
  });

  it('never returns the literal dev-secret outside production either', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'dev-secret';
    const secret = resolveJwtSecret();
    expect(secret).not.toBe('dev-secret');
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });
});
