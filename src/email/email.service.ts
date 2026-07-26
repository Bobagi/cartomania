import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email (verification, password reset), config-driven.
 *
 * With SMTP_* set it sends over SMTP+STARTTLS (e.g. Gmail on :587 with an App
 * Password). WITHOUT them it is a safe no-op that only logs — so the app runs
 * fine without email; verification/reset links just aren't delivered. Never logs
 * the message body (it can carry a token). Send is best-effort and never throws
 * to the caller (a delivery failure must not break the user action or leak
 * whether an address exists).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor() {
    const host = (process.env.SMTP_HOST ?? '').trim();
    const user = (process.env.SMTP_USERNAME ?? '').trim();
    const pass = (process.env.SMTP_PASSWORD ?? '').trim();
    const port = Number(process.env.SMTP_PORT ?? '587');
    this.fromAddress = (process.env.SMTP_FROM ?? user).trim();
    this.fromName = (process.env.SMTP_FROM_NAME ?? 'Cartomania').trim();

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS (upgraded below)
        requireTLS: port !== 465,
        auth: { user, pass },
      });
      this.logger.log(
        `Email enabled (SMTP ${host}:${port} as ${this.fromAddress})`,
      );
    } else {
      this.transporter = null;
      this.logger.warn(
        'Email disabled — SMTP_* not configured (verification/reset links will not send).',
      );
    }
  }

  isEnabled(): boolean {
    return this.transporter !== null;
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `email (not sent — SMTP off): to=${message.to} subject="${message.subject}"`,
      );
      return false;
    }
    if (!message.to) return false;
    try {
      await this.transporter.sendMail({
        from: { address: this.fromAddress, name: this.fromName },
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return true;
    } catch (error) {
      // Never surface the reason to the caller (anti-enumeration); log server-side.
      this.logger.warn(`email send failed to ${message.to}: ${String(error)}`);
      return false;
    }
  }
}
