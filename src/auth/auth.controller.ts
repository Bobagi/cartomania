import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Read the real client IP behind nginx/Cloudflare (never the spoofable XFF head). */
function clientContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const header = (name: string): string | undefined => {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const ipAddress =
    header('cf-connecting-ip') ||
    header('x-real-ip') ||
    request.socket?.remoteAddress ||
    undefined;
  return { ipAddress, userAgent: header('user-agent') };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  /** Which sign-in providers are available (config-driven; the UI mirrors this). */
  @Get('providers')
  providers() {
    return { google: this.googleOAuth.isConfigured() };
  }

  @Post('register')
  register(
    @Req() request: Request,
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      acceptTerms?: boolean;
    },
  ) {
    return this.authService.register(
      body.username,
      body.email,
      body.password,
      body.acceptTerms === true,
      clientContext(request),
    );
  }

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  /** Start a password reset (always 200 - never reveals if the email exists). */
  @Post('forgot-password')
  forgotPassword(@Body() body: { email?: string }) {
    return this.authService.requestPasswordReset(body?.email ?? '');
  }

  /** Complete a password reset with the emailed token (revokes all sessions). */
  @Post('reset-password')
  resetPassword(@Body() body: { token?: string; newPassword?: string }) {
    return this.authService.resetPassword(
      body?.token ?? '',
      body?.newPassword ?? '',
    );
  }

  /** Confirm an email address with the emailed token. */
  @Post('verify-email')
  verifyEmail(@Body() body: { token?: string }) {
    return this.authService.verifyEmail(body?.token ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@CurrentUser() user: { sub: string }) {
    return this.authService.resendVerification(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('email')
  setEmail(
    @CurrentUser() user: { sub: string },
    @Body() body: { email: string },
  ) {
    return this.authService.setEmail(user.sub, body.email);
  }

  /** Link a Google identity to the SIGNED-IN account (from the account page). */
  @UseGuards(JwtAuthGuard)
  @Post('google/link')
  async linkGoogle(
    @CurrentUser() user: { sub: string },
    @Body() body: { code?: string; redirectUri?: string },
  ) {
    if (!this.googleOAuth.isConfigured())
      throw new ServiceUnavailableException('Google sign-in is not configured');
    const code = (body?.code ?? '').trim();
    if (!code) throw new UnauthorizedException('Missing authorization code');
    const profile = await this.googleOAuth.exchangeCodeForUserInfo(
      code,
      body?.redirectUri,
    );
    if (!profile)
      throw new UnauthorizedException('Google authentication failed');
    return this.authService.linkGoogleToUser(user.sub, profile);
  }

  @UseGuards(JwtAuthGuard)
  @Post('google/unlink')
  unlinkGoogle(@CurrentUser() user: { sub: string }) {
    return this.authService.unlinkGoogle(user.sub);
  }

  /**
   * Google sign-in. The web tier performs the browser redirect + CSRF `state`
   * check, then hands us the single-use `code`; WE do the exchange (secret stays
   * server-side) so a forged request can't inject an arbitrary identity.
   */
  @Post('google')
  async google(@Body() body: { code?: string; redirectUri?: string }) {
    if (!this.googleOAuth.isConfigured())
      throw new ServiceUnavailableException('Google sign-in is not configured');
    const code = (body?.code ?? '').trim();
    if (!code) throw new UnauthorizedException('Missing authorization code');
    const profile = await this.googleOAuth.exchangeCodeForUserInfo(
      code,
      body?.redirectUri,
    );
    if (!profile)
      throw new UnauthorizedException('Google authentication failed');
    return this.authService.authenticateWithGoogle(profile);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agreement')
  agreement(@CurrentUser() user: { sub: string }) {
    return this.authService.getAgreementStatus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept-terms')
  acceptTerms(@Req() request: Request, @CurrentUser() user: { sub: string }) {
    return this.authService.acceptCurrentAgreement(
      user.sub,
      clientContext(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  updateAvatar(
    @CurrentUser() user: { sub: string },
    @Body() body: { avatarUrl: string },
  ) {
    return this.authService.updateAvatar(user.sub, body.avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(
    @CurrentUser() user: { sub: string },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('username')
  changeUsername(
    @CurrentUser() user: { sub: string },
    @Body() body: { username: string },
  ) {
    return this.authService.changeUsername(user.sub, body.username);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteAccount(@CurrentUser() user: { sub: string }) {
    return this.authService.deleteAccount(user.sub);
  }
}
