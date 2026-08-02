import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DuelGameService } from './duel-game.service';

/**
 * Server-authoritative game loop. The duel state machine lives entirely on the
 * server (`DuelGameService`); this just keeps it ticking so that every active
 * Attribute Duel keeps progressing and eventually finishes WITHOUT depending on a
 * browser being open. That's what makes the match continue after a player leaves the
 * screen, and it's the foundation for anti-cheat (the client only sends intents - it
 * can no longer stall a match by closing the tab).
 */
@Injectable()
export class DuelProgressionService {
  private readonly logger = new Logger(DuelProgressionService.name);
  private isTicking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly duel: DuelGameService,
  ) {}

  @Interval(1_500)
  async tick(): Promise<void> {
    if (this.isTicking) {
      return;
    }
    this.isTicking = true;

    try {
      const activeGames = await this.prisma.game.findMany({
        where: {
          mode: 'ATTRIBUTE_DUEL',
          winner: null,
          duelStage: { not: 'RESOLVED' },
        },
        select: { id: true },
        orderBy: { updatedAt: 'asc' },
        take: 40,
      });

      for (const game of activeGames) {
        try {
          await this.duel.progressDueDuel(game.id);
        } catch (error) {
          this.logger.warn(
            `[tick] progressDueDuel failed for game=${game.id}: ${String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`[tick] failed: ${String(error)}`);
    } finally {
      this.isTicking = false;
    }
  }
}
