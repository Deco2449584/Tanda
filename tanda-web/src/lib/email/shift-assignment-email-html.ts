import { BRAND } from '@/lib/brand/tokens';
import { PORTAL_COMPANY_TAGLINE, PORTAL_CONTACT } from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { EmployeeShiftAlertType } from '@/lib/notifications/build-shift-notification';

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

export interface ShiftAssignmentEmailInput {
  email: string;
  name: string;
  type: EmployeeShiftAlertType;
  date: string;
  startTime?: string;
  endTime?: string;
  locationLabel?: string;
  department?: string;
  scheduleUrl: string;
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

function formatShiftDateLabel(date: string): string {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function buildShiftDetailRows(input: ShiftAssignmentEmailInput): string {
  const rows: Array<{ label: string; value: string }> = [];
  const dateLabel = formatShiftDateLabel(input.date);
  if (dateLabel) rows.push({ label: 'Date', value: dateLabel });

  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime} – ${input.endTime}`
      : input.startTime || input.endTime || '';
  if (timeRange) rows.push({ label: 'Time', value: timeRange });

  if (input.locationLabel?.trim()) {
    rows.push({ label: 'Location', value: input.locationLabel.trim() });
  }

  if (input.department?.trim()) {
    rows.push({ label: 'Department', value: input.department.trim() });
  }

  if (rows.length === 0) return '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;background-color:${EMAIL.surface};border:1px solid ${EMAIL.border};border-radius:12px;">
    <tr>
      <td style="padding:16px 18px;">
        ${rows
          .map(
            (row) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:${EMAIL.text};">
              <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL.subtle};">${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.value)}</strong>
            </p>`,
          )
          .join('')}
      </td>
    </tr>
  </table>`;
}

export function buildShiftAssignmentEmailSubject(
  input: Pick<ShiftAssignmentEmailInput, 'type'>,
): string {
  return input.type === 'cancelled' ? 'Shift cancelled' : 'New shift assigned';
}

export function buildShiftAssignmentEmailHtml(input: ShiftAssignmentEmailInput): string {
  const firstName = escapeHtml(input.name.split(/\s+/)[0] || input.name);
  const scheduleUrl = escapeHtml(input.scheduleUrl);
  const logoUrl = escapeHtml(input.logoUrl);
  const year = new Date().getFullYear();
  const isCancelled = input.type === 'cancelled';
  const eyebrow = isCancelled ? 'Schedule update' : 'New shift';
  const headline = isCancelled
    ? 'Your shift was cancelled'
    : 'You have a new shift';
  const intro = isCancelled
    ? 'A shift on your schedule was removed. Details are below.'
    : 'A shift was added to your schedule. Please open TimeTracker and confirm whether you can attend.';
  const ctaLabel = isCancelled ? 'View my schedule' : 'Confirm in My schedule';
  const detailRows = buildShiftDetailRows(input);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(buildShiftAssignmentEmailSubject(input))}</title>
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
                ${eyebrow}
              </p>
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:${EMAIL.text};">
                Hi ${firstName}, ${headline.toLowerCase()}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:${EMAIL.muted};">
                ${intro}
              </p>
              ${detailRows}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 28px;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(180deg, ${EMAIL.accent} 0%, ${EMAIL.accentDark} 100%);">
                    <a href="${scheduleUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              ${
                isCancelled
                  ? ''
                  : `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${EMAIL.subtle};">
                Open <strong>My schedule</strong> and tap <strong>I can attend</strong> or <strong>I cannot attend</strong>.
              </p>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;background:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${EMAIL.subtle};">
                If the button does not work, copy and paste this link:
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;word-break:break-all;">
                <a href="${scheduleUrl}" style="color:${EMAIL.accent};text-decoration:underline;">${scheduleUrl}</a>
              </p>
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

export function buildShiftAssignmentEmailText(input: ShiftAssignmentEmailInput): string {
  const firstName = input.name.split(/\s+/)[0] || input.name;
  const dateLabel = formatShiftDateLabel(input.date);
  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime} – ${input.endTime}`
      : input.startTime || input.endTime || '';

  const lines = [`Hi ${firstName},`, ''];

  if (input.type === 'cancelled') {
    lines.push('Your shift was cancelled.');
  } else {
    lines.push('You have a new shift on your schedule.');
    lines.push('Please open My schedule and confirm whether you can attend.');
  }

  if (dateLabel) lines.push('', `Date: ${dateLabel}`);
  if (timeRange) lines.push(`Time: ${timeRange}`);
  if (input.locationLabel?.trim()) lines.push(`Location: ${input.locationLabel.trim()}`);
  if (input.department?.trim()) lines.push(`Department: ${input.department.trim()}`);

  lines.push('', `My schedule: ${input.scheduleUrl}`, '', `Need help? ${PORTAL_CONTACT.email}`);

  return lines.join('\n');
}
