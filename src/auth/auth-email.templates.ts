import { EmailMessage } from '../email/email.service';

/** Public site origin for links in emails. */
export function siteOrigin(): string {
  return (
    process.env.PUBLIC_SITE_URL ?? 'https://cartomania.bobagi.space'
  ).replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(
  title: string,
  bodyHtml: string,
  button: { href: string; label: string },
): string {
  const href = escapeHtml(button.href);
  return `<!doctype html><html><body style="margin:0;background:#0e0b16;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e9dcc0">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:22px;color:#f2e4c4;margin:0 0 8px">Cartomania</h1>
    <h2 style="font-size:18px;color:#e9dcc0;margin:0 0 16px">${escapeHtml(title)}</h2>
    <div style="font-size:14px;line-height:1.6;color:#cdbb8f">${bodyHtml}</div>
    <p style="margin:24px 0">
      <a href="${href}" style="display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${escapeHtml(button.label)}</a>
    </p>
    <p style="font-size:12px;color:#8a7c5e;word-break:break-all">Or paste this link into your browser:<br>${href}</p>
  </div></body></html>`;
}

export function buildVerificationEmail(
  to: string,
  rawToken: string,
): EmailMessage {
  const link = `${siteOrigin()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  return {
    to,
    subject: 'Confirm your Cartomania email',
    text: `Welcome to Cartomania!\n\nConfirm your email address by opening this link (valid for 24 hours):\n${link}\n\nIf you didn't create a Cartomania account, you can ignore this email.`,
    html: shell(
      'Confirm your email',
      `<p>Welcome to Cartomania! Confirm your email address to secure your account. This link is valid for 24 hours.</p>`,
      { href: link, label: 'Confirm email' },
    ),
  };
}

export function buildPasswordResetEmail(
  to: string,
  rawToken: string,
): EmailMessage {
  const link = `${siteOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return {
    to,
    subject: 'Reset your Cartomania password',
    text: `We received a request to reset your Cartomania password.\n\nOpen this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can ignore this email — your password won't change.`,
    html: shell(
      'Reset your password',
      `<p>We received a request to reset your Cartomania password. Choose a new one using the button below. This link is valid for 1 hour.</p><p>If you didn't request this, ignore this email — your password won't change.</p>`,
      { href: link, label: 'Reset password' },
    ),
  };
}
