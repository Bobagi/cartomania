import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BOT_ID, GameState, drawRandomCardsFromDeck } from './game.types';

@Injectable()
export class ClassicGameService {
  private activeClassicStates: { [gameId: string]: GameState } = {};
  private static readonly classicExpiryMs = 5 * 60 * 1000;
  private static readonly turnDurationMs = 10 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  getActiveState(gameId: string) {
    return this.activeClassicStates[gameId];
  }

  setActiveState(gameId: string, state: GameState) {
    if (!state.turnDeadline) {
      state.turnDeadline = Date.now() + ClassicGameService.turnDurationMs;
    }
    this.activeClassicStates[gameId] = state;
  }

  removeActiveState(gameId: string) {
    delete this.activeClassicStates[gameId];
  }

  listActiveFromMemory() {
    return Object.entries(this.activeClassicStates).map(([gameId, s]) => ({
      gameId,
      players: s.players,
      mode: s.mode,
      turn: s.turn,
      lastActivity: s.lastActivity,
      winner: s.winner,
      turnDeadline: s.turnDeadline ?? null,
    }));
  }

  expireOldGames() {
    const now = Date.now();
    const expiredGameIds: string[] = [];
    for (const [gameId, state] of Object.entries(this.activeClassicStates)) {
      if (now - state.lastActivity > ClassicGameService.classicExpiryMs) {
        expiredGameIds.push(gameId);
        delete this.activeClassicStates[gameId];
      }
    }
    return expiredGameIds;
  }

  private currentPlayerId(state: GameState) {
    return state.players[state.turn % 2];
  }

  private setNextDeadline(state: GameState) {
    if (state.winner !== null) {
      state.turnDeadline = null;
      return;
    }
    state.turnDeadline = Date.now() + ClassicGameService.turnDurationMs;
  }

  private forceSkip(state: GameState, skipperId: string, reason?: string) {
    if (reason) state.log.push(reason);
    state.hands[skipperId] ??= [];
    const hasCards = state.hands[skipperId].length > 0;
    state.log.push(
      hasCards
        ? `Player ${skipperId} skips`
        : `Player ${skipperId} has no cards - skip`,
    );

    state.turn++;
    state.lastActivity = Date.now();

    const currentPlayerId = this.currentPlayerId(state);
    state.decks[currentPlayerId] ??= [];
    const drawnCard = drawRandomCardsFromDeck(
      state.decks[currentPlayerId],
      1,
    )[0];
    if (drawnCard) {
      state.hands[currentPlayerId] ??= [];
      state.hands[currentPlayerId].push(drawnCard);
      state.log.push(`${currentPlayerId} draws`);
    } else {
      state.log.push(`${currentPlayerId} cannot draw (deck empty)`);
    }

    const otherPlayerId = state.players[(state.turn + 1) % 2];
    state.hands[currentPlayerId] ??= [];
    state.hands[otherPlayerId] ??= [];
    const currentHand = state.hands[currentPlayerId];
    const otherHand = state.hands[otherPlayerId];
    if (currentHand.length === 0 && otherHand.length === 0) {
      state.winner = null;
      state.log.push('Both out of cards - tie');
      state.turnDeadline = null;
      return true;
    }

    return false;
  }

  private async persistState(
    gameId: string,
    state: GameState,
    completed = false,
  ) {
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        turn: state.turn,
        hp: state.hp,
        winner: state.winner,
        hands: state.hands,
        decks: state.decks,
        log: state.log,
      },
      select: { id: true },
    });

    if (completed || state.winner !== null) {
      delete this.activeClassicStates[gameId];
    }
  }

  private async handleBotIfNeeded(state: GameState) {
    let completed = false;
    while (!state.winner && this.currentPlayerId(state) === BOT_ID) {
      state.hands[BOT_ID] ??= [];
      const botHand = state.hands[BOT_ID];
      if (botHand.length > 0) {
        const pickedBotCard =
          botHand[Math.floor(Math.random() * botHand.length)];
        await this.resolveClassicPlay(state, BOT_ID, pickedBotCard, 'Bot');
        if (state.winner !== null) {
          completed = true;
          this.setNextDeadline(state);
          break;
        }
      } else {
        completed = this.forceSkip(state, BOT_ID, 'Bot has no cards - skip');
        if (completed) break;
      }
      this.setNextDeadline(state);
    }
    return completed;
  }

  private async resolveClassicPlay(
    state: GameState,
    actorId: string,
    cardCode: string,
    actorLabel: string,
  ) {
    const card = await this.prisma.card.findUnique({
      where: { code: cardCode },
    });
    if (!card) throw new Error(`Card "${cardCode}" not found`);

    const [playerAId, playerBId] = state.players;
    const opponentId = playerAId === actorId ? playerBId : playerAId;

    state.hands[actorId] ??= [];
    const playerHand = state.hands[actorId];
    const handIndex = playerHand.indexOf(cardCode);
    if (handIndex < 0)
      throw new Error(`${actorLabel} does not have "${cardCode}"`);
    playerHand.splice(handIndex, 1);

    let playLog = `${actorLabel} played ${card.name}`;
    if (card.damage) {
      state.hp[opponentId] = Math.max(0, state.hp[opponentId] - card.damage);
      playLog += ` → ${card.damage} dmg`;
    }
    if (card.heal) {
      state.hp[actorId] += card.heal;
      playLog += ` → +${card.heal} HP`;
    }

    if (state.hp[opponentId] <= 0 && !state.winner) {
      state.winner = actorId;
      playLog += ' - WIN';
    }

    state.log.push(playLog);
    state.turn++;
    state.lastActivity = Date.now();

    const nextPlayerId = this.currentPlayerId(state);
    if (!state.winner) {
      state.decks[nextPlayerId] ??= [];
      const drawnCard = drawRandomCardsFromDeck(
        state.decks[nextPlayerId],
        1,
      )[0];
      if (drawnCard) {
        state.hands[nextPlayerId] ??= [];
        state.hands[nextPlayerId].push(drawnCard);
        state.log.push(`${nextPlayerId} draws a card`);
      } else {
        state.log.push(`${nextPlayerId} cannot draw (deck empty)`);
      }
    }
  }

  private async enforceTurnDeadline(gameId: string, state: GameState) {
    if (!state.turnDeadline) {
      this.setNextDeadline(state);
      await this.persistState(gameId, state);
      return false;
    }
    if (Date.now() <= state.turnDeadline) return false;

    let completed = false;
    while (
      !state.winner &&
      state.turnDeadline &&
      Date.now() > state.turnDeadline
    ) {
      const currentPlayerId = this.currentPlayerId(state);
      state.hands[currentPlayerId] ??= [];
      const hand = state.hands[currentPlayerId];
      if (hand.length > 0) {
        state.log.push(
          `Timer expired for ${currentPlayerId} - card chosen automatically`,
        );
        const randomCard = hand[Math.floor(Math.random() * hand.length)];
        await this.resolveClassicPlay(
          state,
          currentPlayerId,
          randomCard,
          `Auto (${currentPlayerId})`,
        );
        if (state.winner !== null) {
          completed = true;
          this.setNextDeadline(state);
          break;
        }
      } else {
        completed = this.forceSkip(
          state,
          currentPlayerId,
          `Timer expired for ${currentPlayerId} - skip`,
        );
        if (completed) break;
      }
      this.setNextDeadline(state);
      const botFinished = await this.handleBotIfNeeded(state);
      if (botFinished) {
        completed = true;
        break;
      }
    }

    await this.persistState(gameId, state, completed);
    return completed;
  }

  async playCard(gameId: string, actorId: string, cardCode: string) {
    const state = this.activeClassicStates[gameId];
    if (!state) throw new Error('Game not found or finished (CLASSIC)');
    if (state.mode !== 'CLASSIC') throw new Error('playCard is CLASSIC-only');

    const timedOut = await this.enforceTurnDeadline(gameId, state);
    if (timedOut) return state;

    if (this.currentPlayerId(state) !== actorId)
      throw new Error('It is not this player turn.');

    await this.resolveClassicPlay(
      state,
      actorId,
      cardCode,
      `Player ${actorId}`,
    );
    if (state.winner !== null) {
      this.setNextDeadline(state);
      await this.persistState(gameId, state, true);
      return state;
    }

    this.setNextDeadline(state);
    const botFinished = await this.handleBotIfNeeded(state);
    await this.persistState(gameId, state, botFinished);
    return state;
  }

  async skipTurn(gameId: string, skipperId: string) {
    const state = this.activeClassicStates[gameId];
    if (!state) throw new Error('Game not found or finished (CLASSIC)');
    if (state.mode !== 'CLASSIC') throw new Error('skipTurn is CLASSIC-only');

    const timedOut = await this.enforceTurnDeadline(gameId, state);
    if (timedOut) return state;

    if (this.currentPlayerId(state) !== skipperId)
      throw new Error('It is not this player turn.');

    const completed = this.forceSkip(state, skipperId);
    if (completed) {
      await this.persistState(gameId, state, true);
      return state;
    }

    this.setNextDeadline(state);
    const botFinished = await this.handleBotIfNeeded(state);
    await this.persistState(gameId, state, botFinished);
    return state;
  }
}
