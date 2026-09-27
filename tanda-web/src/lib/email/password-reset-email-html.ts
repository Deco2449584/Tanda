import { BRAND } from '@/lib/brand/tokens';
import { PORTAL_COMPANY_TAGLINE, PORTAL_CONTACT } from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';

const EMAIL = {
  graphite: BRAND.graphite,
  charcoal: BRAND.charcoal,
  silver: BRAND.silver,
  cloud: BRAND.cloud,
  accent: BRAND.magenta,
  accentDark: '#d4198a',
  text: BRAND.graphite,
  muted: BRAND.charcoal,
  subtle: '#71717a',
  border: '#e4e4e7',
  surface: BRAND.cloud,
} as const;

export interface PasswordResetEmailInput {
  email: string;
  name: string;
  resetLink: string;
  appUrl: string;
  logoUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildPasswordResetEmailHtml(input: PasswordResetEmailInput): string {
  const firstName = escapeHtml(input.name.split(/\s+/)[0] || input.name);
  const appDomain = escapeHtml(input.appUrl.replace(/^https?:\/\//, ''));
  const resetLink = escapeHtml(input.resetLink);
  const loginUrl = escapeHtml(`${input.appUrl.replace(/\/+$/, '')}/login`);
  const logoUrl = escapeHtml(input.logoUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset your ${escapeHtml(COMPANY_NAME)} password</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.surface};font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Reset your ${escapeHtml(COMPANY_NAME)} password for ${appDomain}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.surface};padding:32px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid ${EMAIL.border};box-shadow:0 12px 40px rgba(38,38,38,0.12);">
          <tr>
            <td style="padding:36px 32px 28px;background:linear-gradient(90deg, ${EMAIL.graphite} 0%, ${EMAIL.charcoal} 100%);text-align:center;">
              <img
                src="${logoUrl}"
                width="240"
                height="88"
                alt="${escapeHtml(COMPANY_NAME)}"
                style="display:block;margin:0 auto;max-width:240px;width:100%;height:auto;border:0;"
              />
              <p style="margin:14px 0 0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                ${escapeHtml(PORTAL_COMPANY_TAGLINE.toUpperCase())}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;background-color:#ffffff;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL.accent};">
                Password reset
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:${EMAIL.text};">
                Hi ${firstName}, reset your password
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:${EMAIL.muted};">
                We received a request to reset the password for
                <strong style="color:${EMAIL.text};">${escapeHtml(input.email)}</strong>
                on ${appDomain}. Choose a new password with the button below.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 28px;background-color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(180deg, ${EMAIL.accent} 0%, ${EMAIL.accentDark} 100%);">
                    <a href="${resetLink}"
                       target="_blank"
                       style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${EMAIL.subtle};">
                This link is personal and expires soon. If you did not request it, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;background-color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${EMAIL.subtle};">
                After you set a new password, sign in at
                <a href="${loginUrl}" style="color:${EMAIL.accent};text-decoration:none;font-weight:600;">${loginUrl}</a>.
              </p>
              <p style="margin:16px 0 8px;font-size:12px;line-height:1.6;color:${EMAIL.subtle};">
                If the button does not work, copy and paste this link:
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;word-break:break-all;">
                <a href="${resetLink}" style="color:${EMAIL.accent};text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 26px;background-color:${EMAIL.graphite};text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.72);">
                Need help?
                <a href="mailto:${escapeHtml(PORTAL_CONTACT.email)}" style="color:${EMAIL.silver};text-decoration:none;">
                  ${escapeHtml(PORTAL_CONTACT.email)}
                </a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(255,255,255,0.45);">
                © ${year} ${escapeHtml(COMPANY_NAME)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildPasswordResetEmailText(input: PasswordResetEmailInput): string {
  const firstName = input.name.split(/\s+/)[0] || input.name;
  const loginUrl = `${input.appUrl.replace(/\/+$/, '')}/login`;

  return [
    `Hi ${firstName},`,
    '',
    `Reset your ${COMPANY_NAME} password for ${input.email}.`,
    '',
    input.resetLink,
    '',
    `Then sign in at ${loginUrl}.`,
    '',
    'If you did not request this, ignore this email.',
    `Need help? ${PORTAL_CONTACT.email}`,
  ].join('\n');
}
