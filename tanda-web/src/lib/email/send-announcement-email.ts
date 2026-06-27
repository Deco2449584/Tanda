import { getAppBaseUrl, getAppLogoUrl } from '@/lib/app-url';
import {
  buildAnnouncementEmailHtml,
  buildAnnouncementEmailText,
} from '@/lib/email/announcement-email-html';

export interface SendAnnouncementEmailInput {
  email: string;
  name: string;
  title: string;
  body: string;
  announcementId: string;
}

export function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

export async function sendAnnouncementEmail(
  input: SendAnnouncementEmailInput,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;

  const appUrl = getAppBaseUrl();
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || getAppLogoUrl('light');
  const announcementUrl = `${appUrl}/announcements/${input.announcementId}`;

  const emailContent = {
    email: input.email,
    name: input.name,
    title: input.title,
    body: input.body,
    appUrl,
    logoUrl,
    announcementUrl,
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
      subject: input.title.trim(),
      text: buildAnnouncementEmailText(emailContent),
      html: buildAnnouncementEmailHtml(emailContent),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Resend could not send the announcement email.');
  }

  return true;
}
