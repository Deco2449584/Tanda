import webpush from 'web-push';
import { getVapidConfig } from '@/lib/notifications/vapid';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendPushNotification(
  subscriptionJson: string,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  ensureVapidConfigured();

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
  } catch {
    return { ok: false, expired: false };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, expired: true };
    }

    throw error;
  }
}
