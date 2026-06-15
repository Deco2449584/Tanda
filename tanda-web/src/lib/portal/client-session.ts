const TOKEN_KEY = 'portal_session_token';
const AWB_KEY = 'portal_session_awb';

export function savePortalSession(token: string, awbNumber: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(AWB_KEY, awbNumber);
}

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getPortalAwb(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AWB_KEY);
}

export function clearPortalSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AWB_KEY);
}

export function portalAuthHeaders(): HeadersInit {
  const token = getPortalToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
