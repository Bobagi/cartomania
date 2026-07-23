import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtSecret } from './jwt.config';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: resolveJwtSecret(),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
