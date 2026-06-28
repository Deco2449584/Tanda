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

export interface EmployeeInviteEmailInput {
  email: string;
  name: string;
  setupLink: string;
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

export function buildEmployeeInviteEmailHtml(input: EmployeeInviteEmailInput): string {
  const firstName = escapeHtml(input.name.split(/\s+/)[0] || input.name);
  const appDomain = escapeHtml(input.appUrl.replace(/^https?:\/\//, ''));
  const setupLink = escapeHtml(input.setupLink);
  const loginUrl = escapeHtml(`${input.appUrl.replace(/\/+$/, '')}/login`);
  const logoUrl = escapeHtml(input.logoUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Set up your ${escapeHtml(COMPANY_NAME)} account</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.surface};font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your ${escapeHtml(COMPANY_NAME)} account is ready. Set your password and sign in at ${appDomain}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.surface};padding:32px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid ${EMAIL.border};box-shadow:0 12px 40px rgba(38,38,38,0.12);">

          <!-- Header -->
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
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0;">
                <tr>
                  <td style="height:3px;width:56px;background-color:${EMAIL.accent};border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:32px 32px 8px;background-color:#ffffff;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL.accent};">
                Welcome aboard
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:${EMAIL.text};">
                Hi ${firstName}, your account is ready
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:${EMAIL.muted};">
                An administrator created your employee profile for
                <strong style="color:${EMAIL.text};">${appDomain}</strong>.
                Set a password below to access attendance, schedules, leave requests, and more.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding:8px 32px 24px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.surface};border:1px solid ${EMAIL.border};border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL.subtle};">
                      Getting started
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${EMAIL.text};">
                      <span style="display:inline-block;width:22px;height:22px;margin-right:8px;border-radius:999px;background-color:rgba(245,30,160,0.12);color:${EMAIL.accent};font-size:12px;font-weight:700;text-align:center;line-height:22px;vertical-align:middle;">1</span>
                      Click the button and choose a secure password
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:${EMAIL.text};">
                      <span style="display:inline-block;width:22px;height:22px;margin-right:8px;border-radius:999px;background-color:rgba(245,30,160,0.12);color:${EMAIL.accent};font-size:12px;font-weight:700;text-align:center;line-height:22px;vertical-align:middle;">2</span>
                      Sign in at <a href="${loginUrl}" style="color:${EMAIL.accent};text-decoration:none;font-weight:600;">${loginUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 32px 28px;background-color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(180deg, ${EMAIL.accent} 0%, ${EMAIL.accentDark} 100%);">
                    <a href="${setupLink}"
                       target="_blank"
                       style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Set my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${EMAIL.subtle};">
                This link is personal. Do not share it with anyone.
              </p>
            </td>
          </tr>

          <!-- Account note -->
          <tr>
            <td style="padding:0 32px 28px;background-color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${EMAIL.border};">
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${EMAIL.subtle};">
                      Your sign-in email
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:${EMAIL.text};font-weight:600;">
                      ${escapeHtml(input.email.trim().toLowerCase())}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 32px;background-color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${EMAIL.subtle};">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;word-break:break-all;">
                <a href="${setupLink}" style="color:${EMAIL.accent};text-decoration:underline;">${setupLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 26px;background-color:${EMAIL.graphite};text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.72);">
                Need help? Contact your administrator or
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

export function buildEmployeeInviteEmailText(input: EmployeeInviteEmailInput): string {
  const firstName = input.name.split(/\s+/)[0] || input.name;
  const loginUrl = `${input.appUrl.replace(/\/+$/, '')}/login`;
  const appDomain = input.appUrl.replace(/^https?:\/\//, '');

  return [
    `Hi ${firstName},`,
    '',
    `Your ${COMPANY_NAME} employee account is ready on ${appDomain}.`,
    '',
    'Set your password:',
    input.setupLink,
    '',
    `Then sign in at ${loginUrl} with ${input.email.trim().toLowerCase()}.`,
    '',
    `Need help? ${PORTAL_CONTACT.email}`,
  ].join('\n');
}
