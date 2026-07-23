import { HttpException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { CURRENT_AGREEMENT_VERSION } from './agreement.constants';
import type { GoogleUserInfo } from './google-oauth.service';

/**
 * A tiny in-memory fake of the two Prisma models AuthService touches. It stores
 * real rows so the tests assert on observable STATE (what got written), not on
 * "a method was called" — a mutation to the service (e.g. dropping `role: USER`,
 * or auto-linking a Google identity by an UNVERIFIED email) turns them red.
 */
function makeFakePrisma() {
  const players: any[] = [];
  const acceptances: any[] = [];
  let idSeq = 1;

  const matchUnique = (where: any, p: any) =>
    (where.id !== undefined && p.id === where.id) ||
    (where.username !== undefined && p.username === where.username) ||
    (where.email !== undefined && p.email === where.email) ||
    (where.googleId !== undefined && p.googleId === where.googleId);

  return {
    _players: players,
    _acceptances: acceptances,
    player: {
      findUnique: async ({ where }: any) =>
        players.find((p) => matchUnique(where, p)) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `player-${idSeq++}`,
          username: data.username,
          passwordHash: data.passwordHash ?? null,
          role: data.role ?? UserRole.USER,
          avatarUrl: data.avatarUrl ?? null,
          email: data.email ?? null,
          googleId: data.googleId ?? null,
          emailVerified: data.emailVerified ?? false,
        };
        players.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = players.find((p) => matchUnique(where, p));
        Object.assign(row, data);
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
        const row = { id: `acc-${idSeq++}`, ...data };
        acceptances.push(row);
        return row;
      },
    },
  };
}

const jwtStub = { signAsync: async () => 'signed.jwt.token' } as any;

function newService() {
  const prisma = makeFakePrisma();
  const service = new AuthService(prisma as any, jwtStub);
  return { service, prisma };
}

async function expectRejects(promise: Promise<unknown>) {
  let error: unknown;
  try {
    await promise;
  } catch (e) {
    error = e;
  }
  return error;
}

describe('AuthService — registration', () => {
  it('always creates a USER, even though role is never a parameter', async () => {
    const { service, prisma } = newService();
    await service.register('newplayer', 'strongpass123', true, {});
    expect(prisma._players).toHaveLength(1);
    expect(prisma._players[0].role).toBe(UserRole.USER);
  });

  it('records the agreement acceptance at signup (current version)', async () => {
    const { service, prisma } = newService();
    await service.register('consenter', 'strongpass123', true, {
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });
    expect(prisma._acceptances).toHaveLength(1);
    expect(prisma._acceptances[0].documentVersion).toBe(
      CURRENT_AGREEMENT_VERSION,
    );
  });

  it('rejects registration without accepting the terms', async () => {
    const { service, prisma } = newService();
    const err = await expectRejects(
      service.register('noterms', 'strongpass123', false, {}),
    );
    expect(err).toBeDefined();
    expect(prisma._players).toHaveLength(0);
  });

  it.each([
    ['too short', 'abc'],
    ['too long (>72)', 'p'.repeat(73)],
  ])('rejects a password that is %s', async (_label, password) => {
    const { service, prisma } = newService();
    const err = await expectRejects(
      service.register('user1', password, true, {}),
    );
    expect(err).toBeDefined();
    expect(prisma._players).toHaveLength(0);
  });

  it.each([
    ['too short', 'ab'],
    ['too long (>50)', 'u'.repeat(51)],
  ])('rejects a username that is %s', async (_label, username) => {
    const { service } = newService();
    const err = await expectRejects(
      service.register(username, 'strongpass123', true, {}),
    );
    expect(err).toBeDefined();
  });

  it('rejects a duplicate username', async () => {
    const { service } = newService();
    await service.register('dup', 'strongpass123', true, {});
    const err = await expectRejects(
      service.register('dup', 'strongpass123', true, {}),
    );
    expect(err).toBeDefined();
  });
});

describe('AuthService — login + lockout', () => {
  async function seedUser(prisma: any, username: string, password: string) {
    prisma._players.push({
      id: `seed-${username}`,
      username,
      // Low cost: these tests exercise the lockout COUNTER, not bcrypt strength.
      // A cost-12 compare ×19 in ts-jest blows the timeout without changing logic.
      passwordHash: await bcrypt.hash(password, 4),
      role: UserRole.USER,
      avatarUrl: null,
      email: null,
      googleId: null,
      emailVerified: false,
    });
  }

  it('accepts the correct password and rejects a wrong one', async () => {
    const { service, prisma } = newService();
    await seedUser(prisma, 'alice', 'correct-horse');
    const ok = await service.login('alice', 'correct-horse');
    expect(ok.user.username).toBe('alice');
    expect(ok.accessToken).toBeTruthy();

    const err = await expectRejects(service.login('alice', 'wrong'));
    expect(err).toBeInstanceOf(UnauthorizedException);
  });

  it('locks out after 10 failures (429) and a different username is unaffected', async () => {
    const { service, prisma } = newService();
    await seedUser(prisma, 'target', 'correct-horse');
    for (let i = 0; i < 10; i += 1) {
      const err = await expectRejects(service.login('target', `bad${i}`));
      expect(err).toBeInstanceOf(UnauthorizedException); // still 401 for the first 10
    }
    const locked = await expectRejects(service.login('target', 'bad-again'));
    expect(locked).toBeInstanceOf(HttpException);
    expect((locked as HttpException).getStatus()).toBe(429);

    // Lockout is keyed on the submitted username — another user is not affected.
    const other = await expectRejects(service.login('someone_else', 'nope'));
    expect(other).toBeInstanceOf(UnauthorizedException);
  });

  it('a successful login clears the failure counter (no premature lock)', async () => {
    const { service, prisma } = newService();
    await seedUser(prisma, 'resetme', 'correct-horse');
    for (let i = 0; i < 9; i += 1) {
      await expectRejects(service.login('resetme', `bad${i}`));
    }
    await service.login('resetme', 'correct-horse'); // success resets
    // 9 more failures should NOT lock (counter was cleared): still 401, not 429.
    for (let i = 0; i < 9; i += 1) {
      const err = await expectRejects(service.login('resetme', `bad${i}`));
      expect(err).toBeInstanceOf(UnauthorizedException);
    }
  });
});

describe('AuthService — Google authentication', () => {
  const profile = (over: Partial<GoogleUserInfo> = {}): GoogleUserInfo => ({
    sub: 'google-sub-1',
    email: 'user@example.com',
    emailVerified: true,
    name: 'Test User',
    picture: 'https://lh3.googleusercontent.com/a/pic',
    ...over,
  });

  it('refuses a Google profile whose email is NOT verified', async () => {
    const { service, prisma } = newService();
    const err = await expectRejects(
      service.authenticateWithGoogle(profile({ emailVerified: false })),
    );
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(prisma._players).toHaveLength(0);
  });

  it('creates a passwordless USER for a brand-new verified Google identity', async () => {
    const { service, prisma } = newService();
    const result = await service.authenticateWithGoogle(profile());
    expect(prisma._players).toHaveLength(1);
    const created = prisma._players[0];
    expect(created.googleId).toBe('google-sub-1');
    expect(created.email).toBe('user@example.com');
    expect(created.emailVerified).toBe(true);
    expect(created.passwordHash).toBeNull();
    expect(created.role).toBe(UserRole.USER);
    expect(result.user.hasPassword).toBe(false);
  });

  it('returns the existing account matched by googleId (no duplicate)', async () => {
    const { service, prisma } = newService();
    prisma._players.push({
      id: 'existing-1',
      username: 'existing',
      passwordHash: null,
      role: UserRole.USER,
      avatarUrl: null,
      email: 'user@example.com',
      googleId: 'google-sub-1',
      emailVerified: true,
    });
    const result = await service.authenticateWithGoogle(profile());
    expect(prisma._players).toHaveLength(1);
    expect(result.user.id).toBe('existing-1');
  });

  it('links Google to an existing account with the same VERIFIED email', async () => {
    const { service, prisma } = newService();
    prisma._players.push({
      id: 'local-1',
      username: 'localuser',
      passwordHash: await bcrypt.hash('pw12345678', 4),
      role: UserRole.USER,
      avatarUrl: null,
      email: 'user@example.com',
      googleId: null,
      emailVerified: false,
    });
    const result = await service.authenticateWithGoogle(profile());
    expect(prisma._players).toHaveLength(1);
    expect(prisma._players[0].googleId).toBe('google-sub-1');
    expect(result.user.id).toBe('local-1');
  });
});

describe('AuthService — agreement acceptance', () => {
  it('reports not-accepted before and accepted after recording', async () => {
    const { service, prisma } = newService();
    prisma._players.push({
      id: 'p1',
      username: 'p1',
      passwordHash: 'x',
      role: UserRole.USER,
      avatarUrl: null,
      email: null,
      googleId: null,
      emailVerified: false,
    });
    expect(await service.hasAcceptedCurrentAgreement('p1')).toBe(false);
    await service.acceptCurrentAgreement('p1', { ipAddress: '9.9.9.9' });
    expect(await service.hasAcceptedCurrentAgreement('p1')).toBe(true);
    expect(prisma._acceptances[0].documentVersion).toBe(
      CURRENT_AGREEMENT_VERSION,
    );
  });
});
