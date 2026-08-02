import { ConflictException } from '@nestjs/common';
import { GameService } from './game.service';
import { BOT_ID } from './game.types';

/**
 * ONE ACTIVE MATCH PER PLAYER.
 *
 * These tests exist because the rule is only worth as much as the query behind
 * it: the fake below stores REAL rows and evaluates the where clause the service
 * sends (equality, `null`, `{ not }`, `OR`), so dropping `winner: null`, the
 * `duelStage` filter or the playerB side of the `OR` makes a test go red instead
 * of quietly letting a player stack matches again.
 */
function makeFakePrisma() {
  const games: any[] = [];
  const friendships: any[] = [];
  const advisoryLocks: string[] = [];
  const operations: string[] = [];
  let seq = 1;

  const matchesClause = (where: any, row: any): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'OR') {
        return (value as any[]).some((clause) => matchesClause(clause, row));
      }
      if (value === null) return row[key] === null || row[key] === undefined;
      if (value && typeof value === 'object') {
        if ('not' in value) return row[key] !== (value as any).not;
        if ('lt' in value) return row[key] < (value as any).lt;
      }
      return row[key] === value;
    });

  const fake: any = {
    _games: games,
    _friendships: friendships,
    _advisoryLocks: advisoryLocks,
    _operations: operations,
    game: {
      findFirst: async ({ where }: any) => {
        operations.push('findFirst');
        return games.find((game) => matchesClause(where, game)) ?? null;
      },
      findMany: async ({ where }: any) =>
        games.filter((game) => matchesClause(where, game)),
      create: async ({ data }: any) => {
        operations.push('create');
        const row = {
          id: data.id ?? `game-${seq++}`,
          mode: data.mode,
          winner: data.winner ?? null,
          duelStage: data.duelStage ?? null,
          playerAId: data.playerA.connectOrCreate.where.id,
          playerBId: data.playerB.connectOrCreate.where.id,
          updatedAt: new Date(),
        };
        games.push(row);
        return { id: row.id };
      },
    },
    friendship: {
      findFirst: async ({ where }: any) =>
        friendships.find((row) => matchesClause(where, row)) ?? null,
    },
    // Prisma hands a tagged template through as (strings, ...values).
    $executeRaw: async (_strings: TemplateStringsArray, ...values: any[]) => {
      advisoryLocks.push(String(values[0]));
      operations.push(`lock:${String(values[0])}`);
      return 1;
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      operations.push('begin');
      const result = await callback(fake);
      operations.push('commit');
      return result;
    },
  };
  return fake;
}

function makeService(overrides: { activeClassic?: any[] } = {}) {
  const prisma = makeFakePrisma();
  const classic = {
    listActiveFromMemory: () => overrides.activeClassic ?? [],
    setActiveState: jest.fn(),
  };
  const cardRepository = {
    findAll: async () => [
      { code: 'dragon' },
      { code: 'werewolf' },
      { code: 'mage' },
      { code: 'knight' },
      { code: 'wyvern' },
    ],
  };
  const service = new GameService(
    prisma as any,
    classic as any,
    {} as any,
    {} as any,
    cardRepository as any,
  );
  return { service, prisma, classic };
}

const PLAYER_A = 'player-a';
const PLAYER_B = 'player-b';

async function expectConflict(
  promise: Promise<unknown>,
): Promise<Record<string, any>> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictException);
    return (error as ConflictException).getResponse() as Record<string, any>;
  }
  throw new Error('expected a ConflictException, but the call succeeded');
}

describe('GameService - one active match per player', () => {
  it('starts a duel for a player who is not in a match', async () => {
    const { service, prisma } = makeService();

    const { gameId } = await service.createGame(
      PLAYER_A,
      BOT_ID,
      'ATTRIBUTE_DUEL',
    );

    expect(gameId).toBeTruthy();
    expect(prisma._games).toHaveLength(1);
  });

  it('refuses a second match and points the player at the one they are in', async () => {
    const { service, prisma } = makeService();
    const first = await service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL');

    const body = await expectConflict(
      service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL'),
    );

    expect(body.error).toBe('ActiveGameExists');
    expect(body.gameId).toBe(first.gameId);
    expect(body.isRequester).toBe(true);
    expect(prisma._games).toHaveLength(1); // nothing was written
  });

  it('refuses across modes - a classic match blocks a duel', async () => {
    const { service } = makeService({
      activeClassic: [
        { gameId: 'classic-1', players: [PLAYER_A, BOT_ID], winner: null },
      ],
    });

    const body = await expectConflict(
      service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL'),
    );
    expect(body.gameId).toBe('classic-1');
    expect(body.mode).toBe('CLASSIC');
  });

  it('blocks the player who is on the OPPONENT side of an active duel', async () => {
    const { service, prisma } = makeService();
    await service.createGame(PLAYER_A, PLAYER_B, 'ATTRIBUTE_DUEL');

    // Player B sits in playerBId, so a filter that only looked at playerAId
    // would wrongly let them start a second match.
    await expectConflict(
      service.createGame(PLAYER_B, BOT_ID, 'ATTRIBUTE_DUEL'),
    );
    expect(prisma._games).toHaveLength(1);
  });

  it('frees the player once the match has a winner', async () => {
    const { service, prisma } = makeService();
    await service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL');
    prisma._games[0].winner = BOT_ID;

    await expect(
      service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL'),
    ).resolves.toBeTruthy();
    expect(prisma._games).toHaveLength(2);
  });

  it('frees the player once the duel is RESOLVED', async () => {
    const { service, prisma } = makeService();
    await service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL');
    prisma._games[0].duelStage = 'RESOLVED';

    await expect(
      service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL'),
    ).resolves.toBeTruthy();
  });

  it('exempts the bot - it plays every player at the same time', async () => {
    const { service, prisma } = makeService();
    await service.createGame(PLAYER_A, BOT_ID, 'ATTRIBUTE_DUEL');

    await expect(
      service.createGame(PLAYER_B, BOT_ID, 'ATTRIBUTE_DUEL'),
    ).resolves.toBeTruthy();
    expect(prisma._games).toHaveLength(2);
    expect(prisma._advisoryLocks).not.toContain(BOT_ID);
  });

  it('checks and creates behind an advisory lock, inside one transaction', async () => {
    const { service, prisma } = makeService();

    await service.createGame(PLAYER_A, PLAYER_B, 'ATTRIBUTE_DUEL');

    // Both humans are locked, and the lock comes BEFORE the read: without that
    // ordering two simultaneous requests both read "free" and both create.
    expect([...prisma._advisoryLocks].sort()).toEqual([PLAYER_A, PLAYER_B]);
    const operations = prisma._operations as string[];
    expect(operations[0]).toBe('begin');
    expect(operations.indexOf(`lock:${PLAYER_A}`)).toBeLessThan(
      operations.indexOf('findFirst'),
    );
    expect(operations.indexOf(`lock:${PLAYER_B}`)).toBeLessThan(
      operations.indexOf('findFirst'),
    );
    expect(operations.indexOf('findFirst')).toBeLessThan(
      operations.indexOf('create'),
    );
    expect(operations[operations.length - 1]).toBe('commit');
  });

  it('locks players in a stable order so two friend matches cannot deadlock', async () => {
    const { service: serviceOne, prisma: prismaOne } = makeService();
    const { service: serviceTwo, prisma: prismaTwo } = makeService();

    await serviceOne.createGame('zeta', 'alpha', 'ATTRIBUTE_DUEL');
    await serviceTwo.createGame('alpha', 'zeta', 'ATTRIBUTE_DUEL');

    expect(prismaOne._advisoryLocks).toEqual(prismaTwo._advisoryLocks);
  });
});

describe('GameService - challenging a friend', () => {
  function withFriendship(prisma: any) {
    prisma._friendships.push({
      status: 'ACCEPTED',
      blockedById: null,
      requesterId: PLAYER_A,
      addresseeId: PLAYER_B,
    });
  }

  it('refuses to drag a busy friend into a second match', async () => {
    const { service, prisma } = makeService();
    withFriendship(prisma);
    await service.createGame(PLAYER_B, BOT_ID, 'ATTRIBUTE_DUEL');

    const body = await expectConflict(
      service.createGameWithFriend(PLAYER_A, PLAYER_B, 'ATTRIBUTE_DUEL'),
    );

    expect(body.isRequester).toBe(false);
    expect(body.playerId).toBe(PLAYER_B);
    // A game id is a capability (duel state/actions are unauthenticated), so the
    // friend's match id must NOT be handed to whoever challenged them.
    expect(body.gameId).toBeUndefined();
    expect(prisma._games).toHaveLength(1);
  });

  it('starts the match when both friends are free', async () => {
    const { service, prisma } = makeService();
    withFriendship(prisma);

    await expect(
      service.createGameWithFriend(PLAYER_A, PLAYER_B, 'ATTRIBUTE_DUEL'),
    ).resolves.toBeTruthy();
    expect(prisma._games).toHaveLength(1);
  });
});
