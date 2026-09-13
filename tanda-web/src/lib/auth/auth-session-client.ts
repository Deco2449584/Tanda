import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { auth, db } from '@/lib/firebase';
import {
  clearStoredAuthSessionId,
  getStoredAuthSessionId,
} from '@/lib/auth/auth-session-storage';

async function getIdToken(): Promise<string | null> {
  const token = await auth?.currentUser?.getIdToken();
  return token ?? null;
}

export async function claimAuthSession(sessionId: string): Promise<boolean> {
  const token = await getIdToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let detail = `HTTP ${response.status}`;
      try {
        const data = JSON.parse(raw) as { error?: string };
        if (data.error) detail = data.error;
      } catch {
        // ignore non-JSON
      }
      console.warn('claimAuthSession failed', detail);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      'claimAuthSession network error',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function releaseOwnedAuthSession(): Promise<void> {
  const sessionId = getStoredAuthSessionId();
  const token = await getIdToken();

  clearStoredAuthSessionId();

  if (!sessionId || !token) {
    return;
  }

  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Sign-out should continue even if session cleanup fails.
  }
}

export function subscribeToAuthSession(
  uid: string,
  onSessionIdChange: (sessionId: string | null) => void,
): Unsubscribe {
  if (!db) {
    onSessionIdChange(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, COLLECTIONS.AUTH_SESSIONS, uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onSessionIdChange(null);
        return;
      }

      const sessionId = snapshot.data()?.sessionId;
      onSessionIdChange(typeof sessionId === 'string' ? sessionId : null);
    },
    (error) => {
      console.error('subscribeToAuthSession', error);
      onSessionIdChange(null);
    },
  );
}
