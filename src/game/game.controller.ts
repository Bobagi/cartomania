import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Card as PrismaCard } from '@prisma/client';
import { Request } from 'express';
import { ChooseAttributeDto } from './dto/choose-attribute.dto';
import { ChooseCardDto } from './dto/choose-card.dto';
import { PlayCardDto } from './dto/play-card.dto';
import { CardCollectionRecord } from './game-collection.repository';
import { GameService } from './game.service';
import { BOT_ID, GameState } from './game.types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    id?: string;
  };
}

@Controller('game')
export class GameController {
  private readonly logger = new Logger(GameController.name);
  constructor(private readonly gameService: GameService) {}

  /**
   * The match is ALWAYS started for the authenticated caller - the player id is
   * never read from the body. A player may only be in one match at a time, so an
   * anonymous caller naming someone else's id could otherwise burn that player's
   * only slot and lock them out of the game.
   */
  private requireUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.sub ?? request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user identifier');
    }
    return userId;
  }

  /** Start CLASSIC */
  @UseGuards(JwtAuthGuard)
  @Post('start-classic')
  async startClassic(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ gameId: string; state: GameState }> {
    const playerAId = this.requireUserId(request);
    this.logger.log(`Starting CLASSIC for ${playerAId} vs BOT`);
    return this.gameService.createGame(playerAId, BOT_ID, 'CLASSIC');
  }

  /** Start DUEL */
  @UseGuards(JwtAuthGuard)
  @Post('start-duel')
  async startDuel(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ gameId: string; state: GameState }> {
    const playerAId = this.requireUserId(request);
    this.logger.log(`Starting ATTRIBUTE_DUEL for ${playerAId} vs BOT`);
    return this.gameService.createGame(playerAId, BOT_ID, 'ATTRIBUTE_DUEL');
  }

  /** Legacy start (kept for compatibility) -> CLASSIC */
  @UseGuards(JwtAuthGuard)
  @Post('start')
  async startLegacy(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ gameId: string; state: GameState }> {
    const playerAId = this.requireUserId(request);
    this.logger.log(`Starting legacy (CLASSIC) for ${playerAId} vs BOT`);
    return this.gameService.createGame(playerAId, BOT_ID, 'CLASSIC');
  }

  /** Classic actions */
  @Post('play-card')
  async playCard(@Body() dto: PlayCardDto) {
    return this.gameService.playCard(dto.gameId, dto.player, dto.card);
  }

  @Post('skip-turn')
  async skipTurn(@Body() body: { gameId: string; player: string }) {
    return this.gameService.skipTurn(body.gameId, body.player);
  }

  @UseGuards(JwtAuthGuard)
  @Post('start-with-friend')
  async startWithFriend(
    @Req() request: AuthenticatedRequest,
    @Body('friendId') friendId: string,
    @Body('mode') mode?: 'CLASSIC' | 'ATTRIBUTE_DUEL',
  ) {
    const userId = this.requireUserId(request);
    return this.gameService.createGameWithFriend(
      userId,
      friendId,
      mode ?? 'CLASSIC',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('surrender')
  async surrender(
    @Req() request: AuthenticatedRequest,
    @Body('gameId') gameId: string,
  ) {
    const userId = this.requireUserId(request);
    return this.gameService.surrenderGame(gameId, userId);
  }

  /** Duel actions */
  @Post(':id/duel/choose-card')
  chooseCard(@Param('id') id: string, @Body() dto: ChooseCardDto) {
    return this.gameService.chooseCardForDuel(id, dto);
  }

  @Post(':id/duel/choose-attribute')
  chooseAttribute(@Param('id') id: string, @Body() dto: ChooseAttributeDto) {
    return this.gameService.chooseAttributeForDuel(id, dto);
  }

  /** Commit a REVEAL and advance to next round (or finish) */
  @Post(':id/duel/advance')
  advance(@Param('id') id: string) {
    return this.gameService.advanceDuelRound(id);
  }

  /** State & result */
  @Get('state/:gameId')
  async getState(@Param('gameId') gameId: string): Promise<GameState | null> {
    return this.gameService.getState(gameId);
  }

  @Get('result/:gameId')
  async getResult(@Param('gameId') gameId: string) {
    return this.gameService.getResult(gameId);
  }

  /** Expire only in-memory games */
  @Post('expire')
  expire() {
    return { expired: this.gameService.expireOldGames() };
  }

  /** End in-memory game */
  @Delete('end/:gameId')
  async end(@Param('gameId') gameId: string) {
    return this.gameService.deleteGame(gameId);
  }

  /** Card catalog */
  @Get('cards')
  async getCards(
    @Query('collection') collection?: string,
  ): Promise<PrismaCard[]> {
    if (!collection) {
      return this.gameService.getAllCards();
    }

    const targetCollection =
      await this.gameService.getCollectionByIdentifier(collection);
    if (!targetCollection) {
      throw new NotFoundException(
        `Collection with id or slug "${collection}" was not found`,
      );
    }
    return this.gameService.getCardsByCollectionId(targetCollection.id);
  }

  /** Single card by code */
  @Get('cards/:code')
  getCardByCode(@Param('code') code: string) {
    return this.gameService.getCardByCode(code);
  }

  /** Collections */
  @Get('collections')
  getCollections(): Promise<CardCollectionRecord[]> {
    return this.gameService.getCollections();
  }

  @Get('collections/:identifier')
  async getCollection(
    @Param('identifier') identifier: string,
  ): Promise<CardCollectionRecord> {
    const collection =
      await this.gameService.getCollectionByIdentifier(identifier);
    if (!collection) {
      throw new NotFoundException(
        `Collection with id or slug "${identifier}" was not found`,
      );
    }
    return collection;
  }

  @Get('collections/:identifier/cards')
  async getCollectionCards(
    @Param('identifier') identifier: string,
    @Query('locale') queryLocale?: string,
    @Headers('x-cartomania-locale') headerLocale?: string,
  ): Promise<PrismaCard[]> {
    const collection =
      await this.gameService.getCollectionByIdentifier(identifier);
    if (!collection) {
      throw new NotFoundException(
        `Collection with id or slug "${identifier}" was not found`,
      );
    }
    return this.gameService.getCardsByCollectionId(
      collection.id,
      queryLocale ?? headerLocale,
    );
  }

  /** Undo pick */
  @Post(':id/duel/unchoose-card')
  unchooseCard(@Param('id') id: string, @Body() body: { playerId: string }) {
    return this.gameService.unchooseCardForDuel(id, body);
  }

  /** Admin: all actives */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('active')
  getActiveGames() {
    return this.gameService.listActiveGamesUnified();
  }

  /** My actives */
  @UseGuards(JwtAuthGuard)
  @Get('active/mine')
  getActiveGamesOfMine(@Req() request: AuthenticatedRequest) {
    return this.gameService.listActiveForPlayer(this.requireUserId(request));
  }

  /** The single match I'm in right now (the one-match-per-player rule), or null. */
  @UseGuards(JwtAuthGuard)
  @Get('active/current')
  getMyCurrentGame(@Req() request: AuthenticatedRequest) {
    return this.gameService.getActiveGameForPlayer(this.requireUserId(request));
  }

  /** Me: stats (games played / wins) */
  @UseGuards(JwtAuthGuard)
  @Get('stats/me')
  getMyStats(@Req() request: AuthenticatedRequest) {
    return this.gameService.getUserStats(this.requireUserId(request));
  }
}
