import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenPurpose, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { CURRENT_AGREEMENT_VERSION } from './agreement.constants';
import type { GoogleUserInfo } from './google-oauth.service';

/**
 * In-memory fake of the Prisma models AuthService/AuthTokenService touch. Stores
 * real rows so tests assert on observable STATE (what got written), not on mock
 * calls. Supports the `{ increment }` update op and the `authToken` lifecycle so
 * the REAL AuthTokenService runs against it (token single-use is genuinely tested).
 */
function makeFakePrisma() {
  const players: any[] = [];
  const acceptances: any[] = [];
  const authTokens: any[] = [];
  let seq = 1;

  const matchPlayer = (where: any, p: any) =>
    (where.id !== undefined && p.id === where.id) ||
    (where.username !== undefined && p.username === where.username) ||
    (where.email !== undefined && p.email === where.email) ||
    (where.googleId !== undefined && p.googleId === where.googleId);

  const applyData = (row: any, data: any) => {
    for (const [k, v] of Object.entries<any>(data)) {
      if (v && typeof v === 'object' && 'increment' in v)
        row[k] = (row[k] ?? 0) + v.increment;
      else row[k] = v;
    }
  };

  return {
    _players: players,
    _authTokens: authTokens,
    _acceptances: acceptances,
    player: {
      findUnique: async ({ where }: any) =>
        players.find((p) => matchPlayer(where, p)) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `player-${seq++}`,
          username: data.username,
          passwordHash: data.passwordHash ?? null,
          role: data.role ?? UserRole.USER,
          avatarUrl: data.avatarUrl ?? null,
          email: data.email ?? null,
          googleId: data.googleId ?? null,
          emailVerified: data.emailVerified ?? false,
          tokenVersion: 0,
        };
        players.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = players.find((p) => matchPlayer(where, p));
        applyData(row, data);
        return row;
      },
    },
    agreementAcceptance: {
      findFirst: async ({ where }: any) =>
        acceptances.find(
          (a) =>
            a.playerId === where.playerId &&
            a.documentVersion === where.documentVersion,
        ) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `acc-${seq++}`, ...data };
        acceptances.push(row);
        return row;
      },
      deleteMany: async () => ({ count: 0 }),
    },
    authToken: {
      create: async ({ data }: any) => {
        const row = { id: `tok-${seq++}`, usedAt: null, ...data };
        authTokens.push(row);
        return row;
      },
      findUnique: async ({ where }: any) =>
        authTokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const t of authTokens) {
          const ok =
            (where.id === undefined || t.id === where.id) &&
            (where.playerId === undefined || t.playerId === where.playerId) &&
            (where.purpose === undefined || t.purpose === where.purpose) &&
            (where.usedAt === undefined || t.usedAt === where.usedAt);
          if (ok) {
            Object.assign(t, data);
            count += 1;
          }
        }
        return { count };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
}

const jwtStub = {
  signAsync: async (payload: any) => `jwt.${payload.sub}.tv${payload.tv}`,
} as any;

// Email disabled in tests (no SMTP) — verification/reset are no-ops for delivery,
// but the token lifecycle (issued/consumed) is still exercised where we call it directly.
const emailOff = { isEnabled: () => false, send: async () => false } as any;
const emailOn = { isEnabled: () => true, send: async () => true } as any;

function newService(email = emailOff) {
  const prisma = makeFakePrisma();
  const tokens = new AuthTokenService(prisma as any);
  const service = new AuthService(prisma as any, jwtStub, email, tokens);
  return { service, prisma, tokens };
}

async function grab(promise: Promise<unknown>) {
  try {
    return { value: await promise, error: undefined as unknown };
  } catch (error) {
    return { value: undefined as unknown, error };
  }
}

describe('AuthService — registration', () => {
  it('always creates a USER (role is never a parameter)', async () => {
    const { service, prisma } = newService();
    await service.register('newplayer', 'a@b.com', 'strongpass123', true, {});
    expect(prisma._players).toHaveLength(1);
    expect(prisma._players[0].role).toBe(UserRole.USER);
    expect(prisma._players[0].email).toBe('a@b.com');
    expect(prisma._players[0].emailVerified).toBe(false);
  });

  it('records the agreement acceptance at signup', async () => {
    const { service, prisma } = newService();
    await service.register('consenter', 'c@d.com', 'strongpass123', true, {});
    expect(prisma._acceptances[0].documentVersion).toBe(
      CURRENT_AGREEMENT_VERSION,
    );
  });

  it.each([
    ['missing terms', ['validuser', 'valid@e.com', 'strongpass123', false]],
    ['bad email', ['validuser', 'not-an-email', 'strongpass123', true]],
    ['short password', ['validuser', 'valid@e.com', 'abc', true]],
    ['long password', ['validuser', 'valid@e.com', 'p'.repeat(73), true]],
  ] as const)('rejects %s', async (_label, [u, e, p, t]) => {
    const { service, prisma } = newService();
    const { error } = await grab(
      service.register(u as string, e as string, p as string, t as boolean, {}),
    );
    expect(error).toBeDefined();
    expect(prisma._players).toHaveLength(0);
  });

  it('rejects a duplicate email', async () => {
    const { service } = newService();
    await service.register('aaa', 'same@e.com', 'strongpass123', true, {});
    const { error } = await grab(
      service.register('bbb', 'same@e.com', 'strongpass123', true, {}),
    );
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('sends a verification email when SMTP is enabled', async () => {
    const { service, prisma } = newService(emailOn);
    await service.register('verifyme', 'v@e.com', 'strongpass123', true, {});
    const player = prisma._players[0];
    const tok = prisma._authTokens.find((t) => t.playerId === player.id);
    expect(tok?.purpose).toBe(AuthTokenPurpose.EMAIL_VERIFICATION);
  });
});

describe('AuthService — email verification (token single-use)', () => {
  it('verifies with a fresh token, then the same token fails (single-use)', async () => {
    const { service, prisma, tokens } = newService(emailOn);
    const { user } = await service.register(
      'usr',
      'u@e.com',
      'strongpass123',
      true,
      {},
    );
    const raw = await tokens.issue(
      user.id,
      AuthTokenPurpose.EMAIL_VERIFICATION,
      60_000,
    );

    await service.verifyEmail(raw);
    expect(prisma._players.find((p) => p.id === user.id)!.emailVerified).toBe(
      true,
    );

    const { error } = await grab(service.verifyEmail(raw)); // replay
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired token', async () => {
    const { service, tokens } = newService(emailOn);
    const { user } = await service.register(
      'usr',
      'u@e.com',
      'strongpass123',
      true,
      {},
    );
    const raw = await tokens.issue(
      user.id,
      AuthTokenPurpose.EMAIL_VERIFICATION,
      -1,
    );
    const { error } = await grab(service.verifyEmail(raw));
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('rejects a token used for the WRONG purpose', async () => {
    const { service, tokens } = newService(emailOn);
    const { user } = await service.register(
      'usr',
      'u@e.com',
      'strongpass123',
      true,
      {},
    );
    const resetRaw = await tokens.issue(
      user.id,
      AuthTokenPurpose.PASSWORD_RESET,
      60_000,
    );
    const { error } = await grab(service.verifyEmail(resetRaw)); // wrong purpose
    expect(error).toBeInstanceOf(BadRequestException);
  });
});

describe('AuthService — password reset revokes sessions', () => {
  it('bumps tokenVersion (revoking old JWTs) and sets the new password', async () => {
    const { service, prisma, tokens } = newService(emailOn);
    const { user } = await service.register(
      'usr',
      'u@e.com',
      'oldpassword1',
      true,
      {},
    );
    const before = prisma._players.find((p) => p.id === user.id)!.tokenVersion;

    const raw = await tokens.issue(
      user.id,
      AuthTokenPurpose.PASSWORD_RESET,
      60_000,
    );
    await service.resetPassword(raw, 'brandnewpass9');

    const after = prisma._players.find((p) => p.id === user.id)!;
    expect(after.tokenVersion).toBe(before + 1); // all old sessions revoked
    expect(after.emailVerified).toBe(true); // proving mailbox control verifies email
    expect(await bcrypt.compare('brandnewpass9', after.passwordHash)).toBe(
      true,
    );
  });

  it('forgot-password never throws for an unknown email (anti-enumeration)', async () => {
    const { service } = newService(emailOn);
    const res = await service.requestPasswordReset('nobody@nowhere.com');
    expect(res).toEqual({ ok: true });
  });
});

describe('AuthService — Google link/unlink (IDOR + lockout guards)', () => {
  const profile = (over: Partial<GoogleUserInfo> = {}): GoogleUserInfo => ({
    sub: 'g-sub-1',
    email: 'g@e.com',
    emailVerified: true,
    name: 'G',
    picture: 'https://lh3.googleusercontent.com/x',
    ...over,
  });

  it('links Google to the CURRENT account', async () => {
    const { service, prisma } = newService();
    const { user } = await service.register(
      'owner',
      'owner@e.com',
      'strongpass123',
      true,
      {},
    );
    await service.linkGoogleToUser(user.id, profile());
    expect(prisma._players.find((p) => p.id === user.id)!.googleId).toBe(
      'g-sub-1',
    );
  });

  it('refuses to link a Google identity already on ANOTHER account (no hijack)', async () => {
    const { service } = newService();
    const a = await service.register(
      'aaa',
      'a@e.com',
      'strongpass123',
      true,
      {},
    );
    await service.linkGoogleToUser(a.user.id, profile());
    const b = await service.register(
      'bbb',
      'b@e.com',
      'strongpass123',
      true,
      {},
    );
    const { error } = await grab(
      service.linkGoogleToUser(b.user.id, profile()),
    );
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('refuses to link an UNVERIFIED Google email', async () => {
    const { service } = newService();
    const { user } = await service.register(
      'usr',
      'u@e.com',
      'strongpass123',
      true,
      {},
    );
    const { error } = await grab(
      service.linkGoogleToUser(user.id, profile({ emailVerified: false })),
    );
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('refuses to unlink Google from a PASSWORDLESS account (would lock out)', async () => {
    const { service, prisma } = newService();
    // passwordless Google-only account
    const created = await service.authenticateWithGoogle(
      profile({ sub: 'only-g' }),
    );
    const { error } = await grab(service.unlinkGoogle(created.user.id));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      prisma._players.find((p) => p.id === created.user.id)!.googleId,
    ).toBe('only-g');
  });
});

describe('AuthService — login + lockout', () => {
  async function seed(prisma: any, username: string, password: string) {
    prisma._players.push({
      id: `seed-${username}`,
      username,
      passwordHash: await bcrypt.hash(password, 4),
      role: UserRole.USER,
      avatarUrl: null,
      email: null,
      googleId: null,
      emailVerified: false,
      tokenVersion: 0,
    });
  }

  it('accepts correct, rejects wrong, and locks out after 10 fails', async () => {
    const { service, prisma } = newService();
    await seed(prisma, 'target', 'correct-horse');
    expect((await service.login('target', 'correct-horse')).user.username).toBe(
      'target',
    );
    for (let i = 0; i < 10; i += 1) {
      const { error } = await grab(service.login('target', `bad${i}`));
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
    const { error } = await grab(service.login('target', 'again'));
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
  });
});
