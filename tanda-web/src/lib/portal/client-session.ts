const TOKEN_KEY = 'portal_session_token';
const AWB_KEY = 'portal_session_awb';
const KIND_KEY = 'portal_session_kind';
const CLIENT_NAME_KEY = 'portal_session_client';

export type StoredPortalKind = 'awb' | 'account';

export function savePortalSession(input: {
  token: string;
  kind: StoredPortalKind;
  awbNumber?: string;
  clientName?: string;
}): void {
  sessionStorage.setItem(TOKEN_KEY, input.token);
  sessionStorage.setItem(KIND_KEY, input.kind);
  sessionStorage.setItem(AWB_KEY, input.awbNumber ?? '');
  sessionStorage.setItem(CLIENT_NAME_KEY, input.clientName ?? '');
}

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getPortalAwb(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AWB_KEY);
}

export function getPortalKind(): StoredPortalKind {
  if (typeof window === 'undefined') return 'awb';
  return sessionStorage.getItem(KIND_KEY) === 'account' ? 'account' : 'awb';
}

export function getPortalClientName(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(CLIENT_NAME_KEY) ?? '';
}

export function clearPortalSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AWB_KEY);
  sessionStorage.removeItem(KIND_KEY);
  sessionStorage.removeItem(CLIENT_NAME_KEY);
}

export function portalAuthHeaders(): HeadersInit {
  const token = getPortalToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
