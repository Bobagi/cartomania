import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPurpose, Player, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CURRENT_AGREEMENT_VERSION } from './agreement.constants';
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
} from './auth-email.templates';
import {
  AuthTokenService,
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from './auth-token.service';
import { GoogleUserInfo } from './google-oauth.service';

/** bcrypt work factor. 12 is the current sane minimum for a public app. */
const BCRYPT_ROUNDS = 12;
/** bcrypt silently truncates at 72 bytes — reject longer so nothing is ignored. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const EMAIL_MAX = 255;
// Pragmatic email shape check (real validation is that the confirmation email arrives).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A REAL bcrypt hash (cost 12) of a throwaway string. Used as the decoy on the
 * "user does not exist" login branch so bcrypt.compare actually runs the KDF and
 * the response time matches the real-user branch — closes the timing oracle that
 * would otherwise leak whether a username exists (an invalid hash short-circuits).
 * Not a secret: it verifies nothing.
 */
const LOGIN_TIMING_DECOY_HASH =
  '$2a$12$8D175VdYl9XpvepjQ.sVF.VJVKonCt7i3lQm./6g9FA5ypBbckdqK';

/** Login lockout (per submitted username). Temporary — never permanent. Keyed on
 *  the submitted username (real OR not) so a lockout can't become an existence
 *  oracle. Complements the edge (nginx rate-limit + fail2ban) which caps per IP. */
const LOGIN_MAX_FAILS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

interface LoginAttemptBucket {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

type SessionPlayer = Pick<Player, 'id' | 'username' | 'role' | 'tokenVersion'>;

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, LoginAttemptBucket>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private tokens: AuthTokenService,
  ) {}

  private loginKey(username: string): string {
    return (username ?? '').trim().toLowerCase();
  }

  /** Throw 429 if this username is currently locked out. */
  private assertNotLockedOut(username: string): void {
    const bucket = this.loginAttempts.get(this.loginKey(username));
    if (bucket && bucket.lockedUntil > Date.now()) {
      throw new HttpException(
        'Too many failed attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordLoginFailure(username: string): void {
    const key = this.loginKey(username);
    const now = Date.now();
    const bucket = this.loginAttempts.get(key);
    if (!bucket || now - bucket.firstAt > LOGIN_WINDOW_MS) {
      this.loginAttempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
      return;
    }
    bucket.count += 1;
    if (bucket.count >= LOGIN_MAX_FAILS)
      bucket.lockedUntil = now + LOGIN_LOCK_MS;
  }

  private clearLoginFailures(username: string): void {
    this.loginAttempts.delete(this.loginKey(username));
  }

  /** Public, safe shape of a player returned to clients. */
  private toUserDto(player: Player) {
    return {
      id: player.id,
      username: player.username,
      role: player.role,
      avatarUrl: player.avatarUrl ?? null,
      email: player.email ?? null,
      emailVerified: player.emailVerified,
      hasPassword: Boolean(player.passwordHash),
      googleLinked: Boolean(player.googleId),
    };
  }

  private validateUsername(raw: string): string {
    const username = (raw ?? '').trim();
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
      throw new BadRequestException(
        `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`,
      );
    return username;
  }

  private validatePassword(raw: string): string {
    const password = raw ?? '';
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      throw new BadRequestException(
        `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters`,
      );
    return password;
  }

  private normalizeEmail(raw: string): string {
    const email = (raw ?? '').trim().toLowerCase();
    if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_RE.test(email))
      throw new BadRequestException('A valid email is required');
    return email;
  }

  /**
   * Register a new email/password account. The role is ALWAYS USER — it is never
   * taken from the request (a self-service caller must not be able to mint an
   * ADMIN). Email is required (drives verification + password reset + Google
   * auto-link). Accepting the Terms + Privacy is required and recorded.
   */
  async register(
    username: string,
    email: string,
    password: string,
    acceptTerms: boolean,
    context: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const cleanUsername = this.validateUsername(username);
    const cleanEmail = this.normalizeEmail(email);
    const cleanPassword = this.validatePassword(password);
    if (acceptTerms !== true)
      throw new BadRequestException(
        'You must accept the Terms of Use and Privacy Policy',
      );

    if (
      await this.prisma.player.findUnique({
        where: { username: cleanUsername },
      })
    )
      throw new BadRequestException('Username already taken');
    if (await this.prisma.player.findUnique({ where: { email: cleanEmail } }))
      throw new BadRequestException('That email is already registered');

    const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);
    const createdPlayer = await this.prisma.player.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: UserRole.USER,
      },
    });

    await this.recordAgreementAcceptance(createdPlayer.id, context);
    await this.sendVerificationEmail(createdPlayer.id, cleanEmail);

    return {
      accessToken: await this.signForPlayer(createdPlayer),
      user: this.toUserDto(createdPlayer),
    };
  }

  async login(username: string, password: string) {
    this.assertNotLockedOut(username);

    const user = await this.prisma.player.findUnique({
      where: { username: (username ?? '').trim() },
    });
    // Constant-ish path: always run a real bcrypt compare (against a valid decoy
    // hash when the user/password is absent) so response timing doesn't reveal
    // whether the username exists.
    const hash = user?.passwordHash ?? LOGIN_TIMING_DECOY_HASH;
    const ok = await bcrypt.compare(password ?? '', hash);
    if (!user || !user.passwordHash || !ok) {
      this.recordLoginFailure(username);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.clearLoginFailures(username);
    return {
      accessToken: await this.signForPlayer(user),
      user: this.toUserDto(user),
    };
  }

  /**
   * Find-or-create-or-link a Player for a verified Google identity (login/signup
   * with Google — no session required).
   *  - a previously linked account (by googleId) is returned directly;
   *  - an existing account with the same VERIFIED email gets Google linked;
   *  - otherwise a new passwordless account is provisioned.
   * The email MUST be verified by Google (guards account takeover by email spoof).
   */
  async authenticateWithGoogle(profile: GoogleUserInfo) {
    if (!profile.emailVerified)
      throw new UnauthorizedException('Google email is not verified');

    const email = profile.email.trim().toLowerCase();

    const bySubject = await this.prisma.player.findUnique({
      where: { googleId: profile.sub },
    });
    if (bySubject) {
      const refreshed = await this.maybeRefreshAvatar(bySubject, profile);
      return {
        accessToken: await this.signForPlayer(refreshed),
        user: this.toUserDto(refreshed),
      };
    }

    const byEmail = await this.prisma.player.findUnique({ where: { email } });
    if (byEmail) {
      const linked = await this.prisma.player.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          emailVerified: true,
          avatarUrl: byEmail.avatarUrl ?? this.safeAvatar(profile.picture),
        },
      });
      return {
        accessToken: await this.signForPlayer(linked),
        user: this.toUserDto(linked),
      };
    }

    const username = await this.deriveUniqueUsername(profile);
    const created = await this.prisma.player.create({
      data: {
        username,
        email,
        googleId: profile.sub,
        emailVerified: true,
        role: UserRole.USER,
        avatarUrl: this.safeAvatar(profile.picture),
      },
    });
    return {
      accessToken: await this.signForPlayer(created),
      user: this.toUserDto(created),
    };
  }

  /**
   * Link a Google identity to the CURRENTLY signed-in account (from the account
   * page). Matches by the SESSION user, not by email — so it can't hijack another
   * account. Refuses if the Google identity is already linked elsewhere.
   */
  async linkGoogleToUser(userId: string, profile: GoogleUserInfo) {
    if (!profile.emailVerified)
      throw new BadRequestException('Google email is not verified');

    const owner = await this.prisma.player.findUnique({
      where: { id: userId },
    });
    if (!owner) throw new UnauthorizedException();

    const otherWithSubject = await this.prisma.player.findUnique({
      where: { googleId: profile.sub },
    });
    if (otherWithSubject && otherWithSubject.id !== userId)
      throw new BadRequestException(
        'This Google account is already linked to another Cartomania account',
      );

    const email = profile.email.trim().toLowerCase();
    // Adopt the Google email only if the account has none and it's free.
    let adoptEmail: string | undefined;
    if (!owner.email) {
      const emailOwner = await this.prisma.player.findUnique({
        where: { email },
      });
      if (!emailOwner || emailOwner.id === userId) adoptEmail = email;
    }

    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: {
        googleId: profile.sub,
        ...(adoptEmail ? { email: adoptEmail, emailVerified: true } : {}),
        avatarUrl: owner.avatarUrl ?? this.safeAvatar(profile.picture),
      },
    });
    return this.toUserDto(updated);
  }

  /** Remove the Google link. Refused if it would leave the account with no way
   *  to sign in (a passwordless Google-only account). */
  async unlinkGoogle(userId: string) {
    const owner = await this.prisma.player.findUnique({
      where: { id: userId },
    });
    if (!owner) throw new UnauthorizedException();
    if (!owner.googleId)
      throw new BadRequestException('No Google account is linked');
    if (!owner.passwordHash)
      throw new BadRequestException(
        'Set a password before disconnecting Google, or you would be locked out',
      );
    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: { googleId: null },
    });
    return this.toUserDto(updated);
  }

  private safeAvatar(picture: string): string | undefined {
    const p = (picture ?? '').trim();
    return /^https:\/\//i.test(p) && p.length <= 255 ? p : undefined;
  }

  private async maybeRefreshAvatar(player: Player, profile: GoogleUserInfo) {
    const next = this.safeAvatar(profile.picture);
    if (!next || player.avatarUrl) return player;
    return this.prisma.player.update({
      where: { id: player.id },
      data: { avatarUrl: next },
    });
  }

  /** Build a unique username from the Google profile (name/email + dedupe). */
  private async deriveUniqueUsername(profile: GoogleUserInfo): Promise<string> {
    const base =
      (profile.name || profile.email.split('@')[0] || 'player')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9_ ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, USERNAME_MAX - 5) || 'player';
    let candidate = base.length >= USERNAME_MIN ? base : `player_${base}`;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const taken = await this.prisma.player.findUnique({
        where: { username: candidate },
      });
      if (!taken) return candidate;
      const suffix = Math.floor(1000 + Math.random() * 9000);
      candidate = `${base.slice(0, USERNAME_MAX - 5)}_${suffix}`;
    }
    return `player_${Date.now().toString(36)}`;
  }

  /** JWT carries `tv` (tokenVersion); the guard rejects a token whose tv is stale. */
  private async signForPlayer(player: SessionPlayer) {
    return this.jwt.signAsync({
      sub: player.id,
      username: player.username,
      role: player.role,
      tv: player.tokenVersion,
    });
  }

  async me(userId: string) {
    const user = await this.prisma.player.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const termsAccepted = await this.hasAcceptedCurrentAgreement(user.id);
    return { ...this.toUserDto(user), termsAccepted };
  }

  /** Choose a profile avatar (a relative path or http(s) URL, max 255 chars). */
  async updateAvatar(userId: string, avatarUrl: string) {
    const trimmed = (avatarUrl ?? '').trim();
    const isValid =
      trimmed.length > 0 &&
      trimmed.length <= 255 &&
      (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed));
    if (!isValid) throw new BadRequestException('Invalid avatar URL');

    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: { avatarUrl: trimmed },
    });
    return this.toUserDto(updated);
  }

  /**
   * Change the password of the signed-in user. Requires the current password
   * (unless the account is passwordless — a Google-only account SETS its first
   * password here). Bumps tokenVersion to revoke OTHER sessions, and returns a
   * fresh token so the CURRENT device stays signed in.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const cleanNew = this.validatePassword(newPassword);

    const user = await this.prisma.player.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.passwordHash) {
      const ok = await bcrypt.compare(currentPassword ?? '', user.passwordHash);
      if (!ok) throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(cleanNew, BCRYPT_ROUNDS);
    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return {
      ok: true,
      accessToken: await this.signForPlayer(updated),
      user: this.toUserDto(updated),
    };
  }

  async changeUsername(userId: string, newUsername: string) {
    const username = this.validateUsername(newUsername);

    const existing = await this.prisma.player.findUnique({
      where: { username },
    });
    if (existing && existing.id !== userId)
      throw new BadRequestException('Username already taken');

    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: { username },
    });
    return this.toUserDto(updated);
  }

  /** Set or change the account email (re-verification required). */
  async setEmail(userId: string, rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
    const owner = await this.prisma.player.findUnique({
      where: { id: userId },
    });
    if (!owner) throw new UnauthorizedException();
    if (owner.email === email && owner.emailVerified)
      return this.toUserDto(owner);

    const emailOwner = await this.prisma.player.findUnique({
      where: { email },
    });
    if (emailOwner && emailOwner.id !== userId)
      throw new BadRequestException('That email is already registered');

    const updated = await this.prisma.player.update({
      where: { id: userId },
      data: { email, emailVerified: false },
    });
    await this.sendVerificationEmail(updated.id, email);
    return this.toUserDto(updated);
  }

  // ---------- Email verification ----------

  private async sendVerificationEmail(userId: string, email: string) {
    if (!this.email.isEnabled()) return; // no-op without SMTP
    const rawToken = await this.tokens.issue(
      userId,
      AuthTokenPurpose.EMAIL_VERIFICATION,
      EMAIL_VERIFY_TTL_MS,
    );
    await this.email.send(buildVerificationEmail(email, rawToken));
  }

  /** Resend the verification email to the signed-in user (always 200). */
  async resendVerification(userId: string) {
    const user = await this.prisma.player.findUnique({ where: { id: userId } });
    if (user && user.email && !user.emailVerified) {
      await this.sendVerificationEmail(user.id, user.email);
    }
    return { ok: true, emailEnabled: this.email.isEnabled() };
  }

  /** Consume an email-verification token and mark the account verified. */
  async verifyEmail(rawToken: string) {
    const playerId = await this.tokens.consume(
      rawToken,
      AuthTokenPurpose.EMAIL_VERIFICATION,
    );
    if (!playerId)
      throw new BadRequestException(
        'This verification link is invalid or expired',
      );
    await this.prisma.player.update({
      where: { id: playerId },
      data: { emailVerified: true },
    });
    return { ok: true };
  }

  // ---------- Password reset ----------

  /**
   * Start a password reset. ALWAYS returns ok:true (never reveals whether the
   * email exists). If a matching account has a password, email a reset link.
   */
  async requestPasswordReset(rawEmail: string) {
    const email = (rawEmail ?? '').trim().toLowerCase();
    if (email && EMAIL_RE.test(email) && this.email.isEnabled()) {
      const user = await this.prisma.player.findUnique({ where: { email } });
      if (user && user.email) {
        const rawToken = await this.tokens.issue(
          user.id,
          AuthTokenPurpose.PASSWORD_RESET,
          PASSWORD_RESET_TTL_MS,
        );
        await this.email.send(buildPasswordResetEmail(user.email, rawToken));
      }
    }
    return { ok: true };
  }

  /**
   * Complete a password reset: set the new password and bump tokenVersion so ALL
   * existing sessions (including an attacker's) are revoked. The user logs in fresh.
   */
  async resetPassword(rawToken: string, newPassword: string) {
    const cleanNew = this.validatePassword(newPassword);
    const playerId = await this.tokens.consume(
      rawToken,
      AuthTokenPurpose.PASSWORD_RESET,
    );
    if (!playerId)
      throw new BadRequestException('This reset link is invalid or expired');

    const passwordHash = await bcrypt.hash(cleanNew, BCRYPT_ROUNDS);
    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        passwordHash,
        emailVerified: true, // proving control of the mailbox verifies the email
        tokenVersion: { increment: 1 },
      },
    });
    return { ok: true };
  }

  /** Permanently delete the account and everything that references it. */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.authToken.deleteMany({ where: { playerId: userId } }),
      this.prisma.agreementAcceptance.deleteMany({
        where: { playerId: userId },
      }),
      this.prisma.friendChatMessage.deleteMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      }),
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: userId },
            { addresseeId: userId },
            { blockedById: userId },
          ],
        },
      }),
      this.prisma.game.deleteMany({
        where: { OR: [{ playerAId: userId }, { playerBId: userId }] },
      }),
      this.prisma.player.delete({ where: { id: userId } }),
    ]);
    return { ok: true };
  }

  // ---------- Terms of Use / Privacy Policy acceptance ----------

  get currentAgreementVersion(): string {
    return CURRENT_AGREEMENT_VERSION;
  }

  async hasAcceptedCurrentAgreement(userId: string): Promise<boolean> {
    const row = await this.prisma.agreementAcceptance.findFirst({
      where: { playerId: userId, documentVersion: CURRENT_AGREEMENT_VERSION },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getAgreementStatus(userId: string) {
    const accepted = await this.hasAcceptedCurrentAgreement(userId);
    return { currentVersion: CURRENT_AGREEMENT_VERSION, accepted };
  }

  private async recordAgreementAcceptance(
    userId: string,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    await this.prisma.agreementAcceptance.create({
      data: {
        playerId: userId,
        documentVersion: CURRENT_AGREEMENT_VERSION,
        ipAddress: (context.ipAddress ?? '').slice(0, 64) || null,
        userAgent: (context.userAgent ?? '').slice(0, 512) || null,
      },
    });
  }

  /** Record the current user's acceptance of the version in force. */
  async acceptCurrentAgreement(
    userId: string,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.player.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new ForbiddenException();
    await this.recordAgreementAcceptance(userId, context);
    return { ok: true, currentVersion: CURRENT_AGREEMENT_VERSION };
  }
}
