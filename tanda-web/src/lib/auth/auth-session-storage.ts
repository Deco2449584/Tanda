const AUTH_SESSION_ID_KEY = 'tanda_auth_session_id';
const AUTH_SESSION_TAKEOVER_KEY = 'tanda_auth_session_takeover';
export const AUTH_SESSION_MESSAGE_KEY = 'tanda_auth_session_message';

export function getStoredAuthSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(AUTH_SESSION_ID_KEY)?.trim();
  return value || null;
}

export function setStoredAuthSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_SESSION_ID_KEY, sessionId);
}

export function clearStoredAuthSessionId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_ID_KEY);
}

export function createAndStoreAuthSessionId(): string {
  const sessionId = crypto.randomUUID();
  setStoredAuthSessionId(sessionId);
  return sessionId;
}

export function consumeAuthSessionMessage(): string | null {
  if (typeof window === 'undefined') return null;
  const message = window.sessionStorage.getItem(AUTH_SESSION_MESSAGE_KEY)?.trim();
  if (message) {
    window.sessionStorage.removeItem(AUTH_SESSION_MESSAGE_KEY);
  }
  return message || null;
}

export function setAuthSessionMessage(message: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AUTH_SESSION_MESSAGE_KEY, message);
}

/** Marks this browser as intentionally replacing any existing remote session (login). */
export function markSessionTakeover(sessionId: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AUTH_SESSION_TAKEOVER_KEY, sessionId);
}

export function getSessionTakeover(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(AUTH_SESSION_TAKEOVER_KEY)?.trim();
  return value || null;
}

export function clearSessionTakeover(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AUTH_SESSION_TAKEOVER_KEY);
}
