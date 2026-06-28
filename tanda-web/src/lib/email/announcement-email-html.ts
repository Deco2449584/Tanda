import { BRAND } from '@/lib/brand/tokens';
import { PORTAL_COMPANY_TAGLINE, PORTAL_CONTACT } from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';

const EMAIL = {
  graphite: BRAND.graphite,
  charcoal: BRAND.charcoal,
  silver: BRAND.silver,
  cloud: BRAND.cloud,
  accent: BRAND.magenta,
  text: BRAND.graphite,
  muted: BRAND.charcoal,
  subtle: '#71717a',
  border: '#e4e4e7',
  surface: BRAND.cloud,
} as const;

export interface AnnouncementEmailInput {
  email: string;
  name: string;
  title: string;
  body: string;
  appUrl: string;
  logoUrl: string;
  announcementUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatBodyHtml(body: string): string {
  return escapeHtml(body.trim()).replaceAll('\n', '<br />');
}

export function buildAnnouncementEmailHtml(input: AnnouncementEmailInput): string {
  const firstName = escapeHtml(input.name.split(/\s+/)[0] || input.name);
  const title = escapeHtml(input.title.trim());
  const bodyHtml = formatBodyHtml(input.body);
  const announcementUrl = escapeHtml(input.announcementUrl);
  const logoUrl = escapeHtml(input.logoUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.surface};font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL.surface};padding:32px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid ${EMAIL.border};box-shadow:0 12px 40px rgba(38,38,38,0.12);">
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(90deg, ${EMAIL.graphite} 0%, ${EMAIL.charcoal} 100%);text-align:center;">
              <img src="${logoUrl}" width="220" alt="${escapeHtml(COMPANY_NAME)}" style="display:block;margin:0 auto;max-width:220px;height:auto;border:0;" />
              <p style="margin:12px 0 0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                ${escapeHtml(PORTAL_COMPANY_TAGLINE.toUpperCase())}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;background:#ffffff;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL.accent};">
                Company announcement
              </p>
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:${EMAIL.text};">
                ${title}
              </h1>
              <p style="margin:0 0 8px;font-size:14px;color:${EMAIL.subtle};">
                Hi ${firstName},
              </p>
              <div style="margin:0;font-size:15px;line-height:1.7;color:${EMAIL.muted};">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 28px;background:#ffffff;">
              <a href="${announcementUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background:${EMAIL.accent};">
                View in TimeTracker
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${EMAIL.graphite};text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.72);">
                Questions? Contact your administrator or
                <a href="mailto:${escapeHtml(PORTAL_CONTACT.email)}" style="color:${EMAIL.silver};text-decoration:none;">
                  ${escapeHtml(PORTAL_CONTACT.email)}
                </a>
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);">
                © ${year} ${escapeHtml(COMPANY_NAME)}
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

export function buildAnnouncementEmailText(input: AnnouncementEmailInput): string {
  const firstName = input.name.split(/\s+/)[0] || input.name;

  return [
    `Hi ${firstName},`,
    '',
    input.title.trim(),
    '',
    input.body.trim(),
    '',
    `View in TimeTracker: ${input.announcementUrl}`,
    '',
    `Need help? ${PORTAL_CONTACT.email}`,
  ].join('\n');
}
