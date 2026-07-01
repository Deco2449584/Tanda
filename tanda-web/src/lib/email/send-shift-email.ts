import { getAppBaseUrl } from '@/lib/app-url';
import { isResendConfigured } from '@/lib/email/send-announcement-email';
import type { EmployeeShiftAlertType } from '@/lib/notifications/build-shift-notification';

export interface SendShiftEmailInput {
  email: string;
  name: string;
  type: EmployeeShiftAlertType;
  date: string;
  startTime?: string;
  endTime?: string;
}

function buildShiftEmailContent(input: SendShiftEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime}–${input.endTime}`
      : input.startTime || input.endTime || '';
  const detail = [input.date, timeRange].filter(Boolean).join(' · ');
  const scheduleUrl = `${getAppBaseUrl()}/my-schedule`;
  const greeting = input.name.trim() ? `Hi ${input.name.trim()},` : 'Hi,';

  if (input.type === 'cancelled') {
    const subject = 'Shift cancelled';
    const bodyLine = detail
      ? `Your shift on ${detail} was cancelled.`
      : 'One of your shifts was cancelled.';
    return {
      subject,
      text: `${greeting}\n\n${bodyLine}\n\nView your schedule: ${scheduleUrl}`,
      html: `<p>${greeting}</p><p>${bodyLine}</p><p><a href="${scheduleUrl}">View your schedule</a></p>`,
    };
  }

  const subject = 'New shift assigned';
  const bodyLine = detail
    ? `You have a new shift on ${detail}.`
    : 'You have a new shift on your schedule.';
  return {
    subject,
    text: `${greeting}\n\n${bodyLine}\n\nView your schedule: ${scheduleUrl}`,
    html: `<p>${greeting}</p><p>${bodyLine}</p><p><a href="${scheduleUrl}">View your schedule</a></p>`,
  };
}

export async function sendShiftEmail(input: SendShiftEmailInput): Promise<boolean> {
  if (!isResendConfigured()) return false;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;

  const { subject, text, html } = buildShiftEmailContent(input);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email.trim().toLowerCase()],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Resend could not send the shift email.');
  }

  return true;
}
