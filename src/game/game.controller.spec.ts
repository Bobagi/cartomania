import { UnauthorizedException } from '@nestjs/common';
import { GameController } from './game.controller';
import { BOT_ID } from './game.types';

/**
 * Starting a match must always act on the AUTHENTICATED caller. A player can
 * only be in one match at a time, so if a start endpoint took the player id from
 * the request body, anyone could spend someone else's only slot and lock them
 * out of the game.
 */
describe('GameController - who a match is started for', () => {
  function makeController() {
    const gameService = {
      createGame: jest.fn().mockResolvedValue({ gameId: 'game-1', state: {} }),
      createGameWithFriend: jest.fn().mockResolvedValue({ gameId: 'game-2' }),
      listActiveForPlayer: jest.fn().mockResolvedValue([]),
      getActiveGameForPlayer: jest.fn().mockResolvedValue(null),
      getUserStats: jest.fn().mockResolvedValue({}),
    };
    return {
      controller: new GameController(gameService as any),
      gameService,
    };
  }

  const requestFor = (userId: string, body: unknown = {}) =>
    ({ user: { sub: userId }, body }) as any;

  it('starts a duel for the token owner, ignoring any player id in the body', async () => {
    const { controller, gameService } = makeController();

    await controller.startDuel(
      requestFor('me', { playerAId: 'someone-else' }) as any,
    );

    expect(gameService.createGame).toHaveBeenCalledWith(
      'me',
      BOT_ID,
      'ATTRIBUTE_DUEL',
    );
  });

  it('does the same for the classic and legacy start endpoints', async () => {
    const { controller, gameService } = makeController();

    await controller.startClassic(requestFor('me', { playerAId: 'victim' }));
    await controller.startLegacy(requestFor('me', { playerAId: 'victim' }));

    for (const call of gameService.createGame.mock.calls) {
      expect(call[0]).toBe('me');
    }
  });

  it('refuses when the request carries no identified user', async () => {
    const { controller, gameService } = makeController();

    await expect(
      controller.startDuel({ user: {} } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(gameService.createGame).not.toHaveBeenCalled();
  });

  it('challenges a friend as the token owner', async () => {
    const { controller, gameService } = makeController();

    await controller.startWithFriend(
      requestFor('me'),
      'my-friend',
      'ATTRIBUTE_DUEL',
    );

    expect(gameService.createGameWithFriend).toHaveBeenCalledWith(
      'me',
      'my-friend',
      'ATTRIBUTE_DUEL',
    );
  });
});
