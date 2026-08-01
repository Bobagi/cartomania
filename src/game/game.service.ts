import { ConflictException, Injectable } from '@nestjs/common';
import {
  DuelStage,
  FriendshipStatus,
  Prisma,
  Card as PrismaCard,
  CardTemplate as PrismaCardTemplate,
  GameMode as PrismaGameMode,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CardRepository } from './card.repository';
import { ClassicGameService } from './classic-game.service';
import { DuelGameService } from './duel-game.service';
import {
  CardCollectionRecord,
  GameCollectionRepository,
} from './game-collection.repository';
import {
  BOT_ID,
  GameState,
  PlayerCardCollection,
  PlayerHealthCollection,
  convertCardCollectionToPrismaInput,
  deserializeDuelCenter,
  drawRandomCardsFromDeck,
  initializeDuelCenterState,
  prepareNullableJsonField,
  serializeDuelCenter,
} from './game.types';

const DUEL_EXP_MS = 5 * 60 * 1000; // 5 min
const TURN_DURATION_MS = 10 * 1000;

/**
 * The one filter that defines an "active" duel, shared by every place that has
 * to agree on it (the dashboard list, the progression loop's view of the world
 * and the one-match-per-player rule below).
 */
const ACTIVE_DUEL_FILTER = {
  mode: 'ATTRIBUTE_DUEL' as PrismaGameMode,
  winner: null,
  duelStage: { not: 'RESOLVED' as DuelStage },
};

/** A match a player is already in, as reported by the one-match-per-player rule. */
export interface ActiveGameReference {
  gameId: string;
  mode: PrismaGameMode;
}

function createShuffledDeck(cardCodes: string[]): string[] {
  const shuffledDeck = [...cardCodes];
  for (let index = shuffledDeck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temporaryValue = shuffledDeck[index];
    shuffledDeck[index] = shuffledDeck[swapIndex];
    shuffledDeck[swapIndex] = temporaryValue;
  }
  return shuffledDeck;
}

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classic: ClassicGameService,
    private readonly duel: DuelGameService,
    private readonly collectionRepository: GameCollectionRepository,
    private readonly cardRepository: CardRepository,
  ) {}

  /* ---------- Catalog ---------- */
  async getAllCards(): Promise<PrismaCard[]> {
    return this.cardRepository.findAll();
  }

  async getCardsByCollectionId(
    collectionId: string,
    locale?: string,
  ): Promise<PrismaCard[]> {
    return this.cardRepository.findByCollectionId(collectionId, locale);
  }

  async getCardByCode(code: string): Promise<PrismaCard | null> {
    return this.cardRepository.findByCode(code);
  }

  getCollections(): Promise<CardCollectionRecord[]> {
    return this.collectionRepository.listCollections();
  }

  getCollectionByIdentifier(
    identifier: string,
  ): Promise<CardCollectionRecord | null> {
    return this.collectionRepository.findByIdentifier(identifier);
  }

  async getAllTemplates(): Promise<PrismaCardTemplate[]> {
    return this.prisma.cardTemplate.findMany();
  }

  /* ---------- One match per player ---------- */

  /**
   * ONE ACTIVE MATCH PER PLAYER (owner rule, 2026-08-01). A player who is already
   * in a match cannot be put into another one - not by starting a duel, not by a
   * friend challenging them.
   *
   * "Active" is EXACTLY what the dashboard lists in `listActiveForPlayer`: an
   * unresolved ATTRIBUTE_DUEL row, or a CLASSIC game still held in memory. CLASSIC
   * rows in the database are deliberately NOT counted: their state lives in memory,
   * is lost on restart and nothing ever marks the row finished, so counting them
   * would lock a player out of the game forever. Keeping the two definitions equal
   * is what stops the UI from saying "no games" while the server refuses to start one.
   *
   * A stuck player is never stuck for long: `DuelProgressionService` drives every
   * duel to a winner on its own (10s per turn), and the player can always surrender.
   */
  private async findActiveGameForPlayer(
    playerId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<ActiveGameReference | null> {
    if (playerId === BOT_ID) return null; // the bot plays everyone at once

    const activeDuel = await client.game.findFirst({
      where: {
        ...ACTIVE_DUEL_FILTER,
        OR: [{ playerAId: playerId }, { playerBId: playerId }],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, mode: true },
    });
    if (activeDuel) return { gameId: activeDuel.id, mode: activeDuel.mode };

    const activeClassic = this.classic
      .listActiveFromMemory()
      .find(
        (game) =>
          game.winner === null && (game.players ?? []).includes(playerId),
      );
    if (activeClassic) return { gameId: activeClassic.gameId, mode: 'CLASSIC' };

    return null;
  }

  /**
   * The game id is only handed back to the player who is actually IN that match:
   * duel state/actions are unauthenticated (see the TODO in CLAUDE.md), so a game
   * id is a capability - telling A that B is busy must not tell A *which* match.
   */
  private buildActiveGameConflict(
    busyPlayerId: string,
    requesterId: string,
    activeGame: ActiveGameReference,
  ): ConflictException {
    const isRequester = busyPlayerId === requesterId;
    return new ConflictException({
      error: 'ActiveGameExists',
      message: isRequester
        ? 'You already have a match in progress. Finish it before starting another one.'
        : 'That player already has a match in progress.',
      playerId: busyPlayerId,
      isRequester,
      ...(isRequester
        ? { gameId: activeGame.gameId, mode: activeGame.mode }
        : {}),
    });
  }

  /** The match a player is currently in, or null. Used by the controller. */
  async getActiveGameForPlayer(
    playerId: string,
  ): Promise<ActiveGameReference | null> {
    return this.findActiveGameForPlayer(playerId);
  }

  /* ---------- Create Game ---------- */
  async createGame(
    playerAId: string,
    playerBId: string = BOT_ID,
    mode: PrismaGameMode = 'CLASSIC',
  ): Promise<{ gameId: string; state: GameState }> {
    const gameId = randomUUID();
    const placeholderHash = await bcrypt.hash(randomUUID(), 10);

    const allCards = await this.getAllCards();
    const availableCardCodes = allCards.length
      ? Array.from(new Set(allCards.map((card) => card.code)))
      : ['fireball', 'lightning', 'heal'];

    const deckA = createShuffledDeck(availableCardCodes);
    const deckB = createShuffledDeck(availableCardCodes);
    const handA = drawRandomCardsFromDeck(deckA, 4);
    const handB = drawRandomCardsFromDeck(deckB, 4);

    const now = Date.now();
    const duelCenterState =
      mode === 'ATTRIBUTE_DUEL' ? initializeDuelCenterState() : null;
    if (duelCenterState) {
      duelCenterState.chooserId = playerAId;
      duelCenterState.deadlineAt = now + TURN_DURATION_MS;
    }

    const playerBUsername = playerBId === BOT_ID ? 'Bot Opponent' : playerBId;
    const initialState: GameState = {
      players: [playerAId, playerBId],
      playerUsernames: {
        [playerAId]: playerAId,
        [playerBId]: playerBUsername,
      },
      turn: 0,
      log: ['Game created'],
      hp: { [playerAId]: 20, [playerBId]: 20 },
      winner: null,
      hands: { [playerAId]: handA, [playerBId]: handB },
      decks: { [playerAId]: deckA, [playerBId]: deckB },
      lastActivity: now,
      turnDeadline: now + TURN_DURATION_MS,
      mode,
      duelStage: mode === 'ATTRIBUTE_DUEL' ? 'PICK_CARD' : null,
      duelCenter: duelCenterState,
      discardPiles:
        mode === 'ATTRIBUTE_DUEL' ? { [playerAId]: [], [playerBId]: [] } : null,
    };

    const createPlayerAInput: Prisma.PlayerCreateWithoutGamesAsAInput = {
      id: playerAId,
      username: playerAId,
      passwordHash: placeholderHash,
    };
    const createPlayerBInput: Prisma.PlayerCreateWithoutGamesAsBInput = {
      id: playerBId,
      username: playerBUsername,
      passwordHash: placeholderHash,
    };

    // The whole check-then-create runs in ONE transaction, and each human player
    // is serialized by a Postgres advisory lock first. Without the lock two
    // requests firing at the same instant (double click, replayed request, two
    // tabs) both read "no active match" and both create one - the exact race the
    // rule is meant to make impossible. Locks are taken in a stable order so two
    // concurrent friend matches can never deadlock each other.
    const humanPlayerIds = Array.from(
      new Set([playerAId, playerBId].filter((id) => id !== BOT_ID)),
    );
    const lockOrderedPlayerIds = [...humanPlayerIds].sort();

    await this.prisma.$transaction(async (tx) => {
      for (const playerId of lockOrderedPlayerIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${playerId}))`;
      }

      for (const playerId of humanPlayerIds) {
        const activeGame = await this.findActiveGameForPlayer(playerId, tx);
        if (activeGame) {
          throw this.buildActiveGameConflict(playerId, playerAId, activeGame);
        }
      }

      await tx.game.create({
        data: {
          id: gameId,
          turn: initialState.turn,
          hp: initialState.hp,
          winner: initialState.winner,
          hands: initialState.hands,
          decks: initialState.decks,
          log: initialState.log,
          mode,
          duelStage: initialState.duelStage,
          duelCenter: prepareNullableJsonField(
            serializeDuelCenter(initialState.duelCenter),
          ),
          discardPiles: prepareNullableJsonField(
            convertCardCollectionToPrismaInput(initialState.discardPiles),
          ),
          playerA: {
            connectOrCreate: {
              where: { id: playerAId },
              create: createPlayerAInput,
            },
          },
          playerB: {
            connectOrCreate: {
              where: { id: playerBId },
              create: createPlayerBInput,
            },
          },
        },
        select: { id: true },
      });
    });

    if (mode === 'CLASSIC') this.classic.setActiveState(gameId, initialState);
    return { gameId, state: initialState };
  }

  async createGameWithFriend(
    requesterId: string,
    friendId: string,
    mode: PrismaGameMode = 'CLASSIC',
  ) {
    if (requesterId === friendId)
      throw new Error('Cannot start a game against yourself.');
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        blockedById: null,
        OR: [
          { requesterId: requesterId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: requesterId },
        ],
      },
    });
    if (!friendship)
      throw new Error('Players must be friends before starting a match.');

    return this.createGame(requesterId, friendId, mode);
  }

  /* ---------- Classic actions ---------- */
  async playCard(gameId: string, actorId: string, cardCode: string) {
    return this.classic.playCard(gameId, actorId, cardCode);
  }
  async skipTurn(gameId: string, skipperId: string) {
    return this.classic.skipTurn(gameId, skipperId);
  }

  /* ---------- Duel actions ---------- */
  async chooseCardForDuel(
    gameId: string,
    dto: { playerId: string; cardCode: string },
  ) {
    return this.duel.chooseCardForDuel(gameId, dto);
  }
  async chooseAttributeForDuel(
    gameId: string,
    dto: { playerId: string; attribute: 'magic' | 'might' | 'fire' },
  ) {
    return this.duel.chooseAttributeForDuel(gameId, dto);
  }
  async advanceDuelRound(gameId: string) {
    return this.duel.advanceDuelRound(gameId);
  }

  /* ---------- State & Result ---------- */
  async getState(gameId: string): Promise<GameState | null> {
    const inMemoryState = this.classic.getActiveState(gameId);
    if (inMemoryState) return inMemoryState;

    const dbGame = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        playerAId: true,
        playerBId: true,
        turn: true,
        hp: true,
        winner: true,
        hands: true,
        decks: true,
        log: true,
        mode: true,
        duelStage: true,
        duelCenter: true,
        discardPiles: true,
        updatedAt: true,
        playerA: { select: { username: true } },
        playerB: { select: { username: true } },
      },
    });
    if (!dbGame) return null;

    const duelCenter =
      dbGame.duelCenter === null
        ? null
        : deserializeDuelCenter(dbGame.duelCenter);

    const playerAUsername = dbGame.playerA?.username ?? dbGame.playerAId;
    const playerBUsername = dbGame.playerB?.username ?? dbGame.playerBId;

    const mappedState: GameState = {
      players: [dbGame.playerAId, dbGame.playerBId],
      playerUsernames: {
        [dbGame.playerAId]: playerAUsername,
        [dbGame.playerBId]: playerBUsername,
      },
      turn: dbGame.turn,
      log: (dbGame.log as string[]) ?? [],
      hp: dbGame.hp as PlayerHealthCollection,
      winner: dbGame.winner ?? null,
      hands: dbGame.hands as PlayerCardCollection,
      decks: dbGame.decks as PlayerCardCollection,
      lastActivity: new Date(dbGame.updatedAt).getTime(),
      turnDeadline: duelCenter?.deadlineAt ?? null,
      mode: dbGame.mode,
      duelStage: dbGame.duelStage ?? null,
      duelCenter,
      discardPiles:
        (dbGame.discardPiles as PlayerCardCollection | null) ?? null,
    };
    return mappedState;
  }

  async getResult(gameId: string) {
    const mem = this.classic.getActiveState(gameId);
    if (mem && mem.winner !== undefined)
      return { winner: mem.winner, log: mem.log };

    const db = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { winner: true, log: true },
    });
    if (!db) throw new Error('Game not found');
    return { winner: db.winner, log: db.log as string[] };
  }

  async surrenderGame(gameId: string, playerId: string) {
    const memState = this.classic.getActiveState(gameId);
    if (memState) {
      if (!memState.players.includes(playerId))
        throw new Error('Player is not part of this game.');
      const opponentId =
        memState.players.find((p) => p !== playerId) ?? memState.players[0];
      memState.winner = opponentId;
      memState.turnDeadline = null;
      memState.log.push(`Player ${playerId} surrendered.`);
      memState.lastActivity = Date.now();

      await this.prisma.game.update({
        where: { id: gameId },
        data: {
          winner: opponentId,
          log: memState.log,
          hp: memState.hp,
          turn: memState.turn,
          hands: memState.hands,
          decks: memState.decks,
        },
        select: { id: true },
      });
      this.classic.removeActiveState(gameId);
      return { winner: opponentId };
    }

    const dbGame = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        playerAId: true,
        playerBId: true,
        winner: true,
        log: true,
      },
    });
    if (!dbGame) throw new Error('Game not found');
    if (![dbGame.playerAId, dbGame.playerBId].includes(playerId))
      throw new Error('Player is not part of this game.');
    if (dbGame.winner)
      return { winner: dbGame.winner, log: dbGame.log as string[] };

    const opponentId =
      dbGame.playerAId === playerId ? dbGame.playerBId : dbGame.playerAId;
    const existingLog = (dbGame.log as string[]) ?? [];
    existingLog.push(`Player ${playerId} surrendered.`);
    const updated = await this.prisma.game.update({
      where: { id: gameId },
      data: { winner: opponentId, log: existingLog },
      select: { winner: true },
    });
    return { winner: updated.winner, log: existingLog };
  }

  /* ---------- Active list ---------- */
  private async listActiveDuelFromDb() {
    const rows = await this.prisma.game.findMany({
      where: ACTIVE_DUEL_FILTER,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        playerAId: true,
        playerBId: true,
        mode: true,
        turn: true,
        updatedAt: true,
        winner: true,
      },
    });
    return rows.map((g) => ({
      gameId: g.id,
      players: [g.playerAId, g.playerBId],
      mode: g.mode,
      turn: g.turn,
      lastActivity: new Date(g.updatedAt).getTime(),
      winner: g.winner ?? null,
    }));
  }
  async listActiveGamesUnified() {
    const classic = this.classic.listActiveFromMemory();
    const duel = await this.listActiveDuelFromDb();
    return [...duel, ...classic];
  }

  /* ---------- Expire & Delete ---------- */
  async expireOldGames(): Promise<string[]> {
    const expiredClassic = this.classic.expireOldGames();
    const cutoff = new Date(Date.now() - DUEL_EXP_MS);
    await this.prisma.game.updateMany({
      where: {
        ...ACTIVE_DUEL_FILTER,
        updatedAt: { lt: cutoff },
      },
      data: { duelStage: 'RESOLVED' as DuelStage },
    });
    return expiredClassic;
  }

  async deleteGame(gameId: string) {
    const existedClassic = !!this.classic.getActiveState(gameId);
    this.classic.removeActiveState(gameId);
    const res = await this.prisma.game.updateMany({
      where: {
        id: gameId,
        mode: 'ATTRIBUTE_DUEL',
        duelStage: { not: 'RESOLVED' },
      },
      data: { duelStage: 'RESOLVED' as DuelStage },
    });
    return { removed: existedClassic || res.count > 0 };
  }

  async unchooseCardForDuel(gameId: string, dto: { playerId: string }) {
    return this.duel.unchooseCardForDuel(gameId, dto);
  }

  async listActiveForPlayer(playerId: string) {
    const classic = this.classic
      .listActiveFromMemory()
      .filter((g) => g.players?.includes(playerId));
    const rows = await this.prisma.game.findMany({
      where: {
        ...ACTIVE_DUEL_FILTER,
        OR: [{ playerAId: playerId }, { playerBId: playerId }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        playerAId: true,
        playerBId: true,
        mode: true,
        turn: true,
        updatedAt: true,
        winner: true,
      },
    });
    const duel = rows.map((g) => ({
      gameId: g.id,
      players: [g.playerAId, g.playerBId],
      mode: g.mode,
      turn: g.turn,
      lastActivity: new Date(g.updatedAt).getTime(),
      winner: g.winner ?? null,
    }));
    return [...duel, ...classic];
  }

  /* ---------- Stats ---------- */
  async getUserStats(userId: string) {
    const gamesPlayed = await this.prisma.game.count({
      where: { OR: [{ playerAId: userId }, { playerBId: userId }] },
    });
    const gamesWon = await this.prisma.game.count({
      where: { winner: userId },
    });
    const gamesDrawn = await this.prisma.game.count({
      where: {
        winner: 'DRAW',
        OR: [{ playerAId: userId }, { playerBId: userId }],
      },
    });
    return { gamesPlayed, gamesWon, gamesDrawn };
  }
}
