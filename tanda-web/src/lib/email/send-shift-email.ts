import { getAppBaseUrl, getAppLogoUrl } from '@/lib/app-url';
import {
  buildShiftAssignmentEmailHtml,
  buildShiftAssignmentEmailSubject,
  buildShiftAssignmentEmailText,
} from '@/lib/email/shift-assignment-email-html';
import { isResendConfigured } from '@/lib/email/send-announcement-email';
import type { EmployeeShiftAlertType } from '@/lib/notifications/build-shift-notification';

export interface SendShiftEmailInput {
  email: string;
  name: string;
  type: EmployeeShiftAlertType;
  date: string;
  startTime?: string;
  endTime?: string;
  locationLabel?: string;
  department?: string;
}

export async function sendShiftEmail(input: SendShiftEmailInput): Promise<boolean> {
  if (!isResendConfigured()) return false;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;

  const appUrl = getAppBaseUrl();
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || getAppLogoUrl('light');
  const scheduleUrl = `${appUrl}/my-schedule`;

  const emailContent = {
    email: input.email,
    name: input.name,
    type: input.type,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    locationLabel: input.locationLabel,
    department: input.department,
    scheduleUrl,
    appUrl,
    logoUrl,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email.trim().toLowerCase()],
      subject: buildShiftAssignmentEmailSubject(emailContent),
      text: buildShiftAssignmentEmailText(emailContent),
      html: buildShiftAssignmentEmailHtml(emailContent),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Resend could not send the shift email.');
  }

  return true;
}
