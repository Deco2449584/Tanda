/**
 * Firebase Admin `generatePasswordResetLink` always returns a firebaseapp.com URL.
 * Rewrite it so invite emails open our `/auth/action` page on APP_BASE_URL (Vercel).
 */
export function rewriteFirebaseAuthLinkToApp(
  firebaseLink: string,
  customActionUrl: string,
): string {
  try {
    const parsed = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get('oobCode');
    const mode = parsed.searchParams.get('mode');

    if (!oobCode || !mode) {
      return firebaseLink;
    }

    const custom = new URL(customActionUrl);
    custom.searchParams.set('mode', mode);
    custom.searchParams.set('oobCode', oobCode);

    const apiKey = parsed.searchParams.get('apiKey');
    const lang = parsed.searchParams.get('lang');
    if (apiKey) custom.searchParams.set('apiKey', apiKey);
    if (lang) custom.searchParams.set('lang', lang);

    return custom.toString();
  } catch {
    return firebaseLink;
  }
}
