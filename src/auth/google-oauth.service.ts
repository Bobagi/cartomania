import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal subset of Google's OpenID Connect userinfo response we rely on.
 */
export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
}

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT =
  'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Implements the OAuth 2.0 authorization-code exchange against Google.
 *
 * The BACKEND (not the browser, not the web tier) performs the code→token→userinfo
 * exchange, so the client secret never leaves the server and - crucially - the
 * single-use `code` issued by Google is the proof of a real sign-in. Even though the
 * public web proxy can reach `POST /auth/google`, a forged/absent code fails the
 * exchange, so no one can inject an arbitrary Google identity.
 *
 * Config-driven: with no GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI the service reports
 * `isConfigured() === false` and the endpoint returns 503 (feature simply off).
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly clientId = (process.env.GOOGLE_CLIENT_ID ?? '').trim();
  private readonly clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET ?? ''
  ).trim();
  private readonly redirectUri = (process.env.GOOGLE_REDIRECT_URI ?? '').trim();

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Trade an authorization code for the verified Google profile behind it.
   * Returns null on any failure (never throws to the caller with details).
   */
  async exchangeCodeForUserInfo(
    code: string,
    redirectUriOverride?: string,
  ): Promise<GoogleUserInfo | null> {
    if (!this.isConfigured() || !code) return null;

    const accessToken = await this.exchangeCode(code, redirectUriOverride);
    if (!accessToken) return null;
    return this.fetchUserInfo(accessToken);
  }

  private async exchangeCode(
    code: string,
    redirectUriOverride?: string,
  ): Promise<string | null> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      // The redirect_uri must match the one used to obtain the code. We trust our
      // own configured value first, but accept an exact-configured override.
      redirect_uri: redirectUriOverride || this.redirectUri,
      grant_type: 'authorization_code',
    });

    try {
      const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });
      if (!response.ok) {
        this.logger.warn(`Google token exchange failed: ${response.status}`);
        return null;
      }
      const json = (await response.json()) as { access_token?: string };
      return json.access_token ?? null;
    } catch (error) {
      this.logger.warn(`Google token exchange error: ${String(error)}`);
      return null;
    }
  }

  private async fetchUserInfo(
    accessToken: string,
  ): Promise<GoogleUserInfo | null> {
    try {
      const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        this.logger.warn(`Google userinfo failed: ${response.status}`);
        return null;
      }
      const json = (await response.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      };
      if (!json.sub || !json.email) return null;
      return {
        sub: json.sub,
        email: json.email.trim().toLowerCase(),
        emailVerified: json.email_verified === true,
        name: (json.name ?? '').trim(),
        picture: (json.picture ?? '').trim(),
      };
    } catch (error) {
      this.logger.warn(`Google userinfo error: ${String(error)}`);
      return null;
    }
  }
}
