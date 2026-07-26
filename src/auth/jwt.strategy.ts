import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { resolveJwtSecret } from './jwt.config';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: resolveJwtSecret(),
      ignoreExpiration: false,
    });
  }

  /**
   * Beyond the signature/expiry, verify the account still exists and the token's
   * session-version matches the DB. A stale `tv` (after a password change/reset or
   * unlink) or a deleted user ⇒ 401 — so those actions actually revoke sessions,
   * instead of a signed JWT staying valid for its full lifetime.
   */
  async validate(payload: JwtPayload) {
    const player = await this.prisma.player.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, tokenVersion: true },
    });
    if (!player) throw new UnauthorizedException();
    // Legacy tokens issued before `tv` existed default to 0, matching a fresh account.
    if ((payload.tv ?? 0) !== player.tokenVersion)
      throw new UnauthorizedException('Session expired');

    return { sub: player.id, username: player.username, role: player.role };
  }
}
