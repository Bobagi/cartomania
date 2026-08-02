import { Injectable } from '@nestjs/common';
import { AuthTokenPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * One-time tokens for email verification / password reset. Only the SHA-256 hash
 * is persisted; the raw token exists only in the email link. Creating a new token
 * of a purpose invalidates the user's prior ones (a fresh reset request kills the
 * old link). Consuming is single-use and time-limited.
 */
@Injectable()
export class AuthTokenService {
  constructor(private prisma: PrismaService) {}

  /** Issue a fresh token, returning the RAW value (store only its hash). */
  async issue(
    playerId: string,
    purpose: AuthTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      // Invalidate prior unused tokens of this purpose for the user.
      this.prisma.authToken.updateMany({
        where: { playerId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: {
          playerId,
          purpose,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      }),
    ]);
    return rawToken;
  }

  /**
   * Validate + single-use consume a token. Returns the playerId on success, or
   * null if the token is unknown/expired/used/wrong-purpose. The mark-used is
   * conditional (updateMany with usedAt:null) so two concurrent consumers can't
   * both succeed on the same token.
   */
  async consume(
    rawToken: string,
    purpose: AuthTokenPurpose,
  ): Promise<string | null> {
    const tokenHash = hashToken((rawToken ?? '').trim());
    if (!rawToken) return null;
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });
    if (
      !row ||
      row.purpose !== purpose ||
      row.usedAt !== null ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }
    const claimed = await this.prisma.authToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return null; // lost the race
    return row.playerId;
  }
}
