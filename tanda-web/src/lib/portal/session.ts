import { SignJWT, jwtVerify } from 'jose';

export type PortalSessionKind = 'awb' | 'account';

export interface PortalSessionPayload {
  portalClientId: string;
  kind: PortalSessionKind;
  awbNumber?: string;
  clientName?: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): Uint8Array {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('PORTAL_SESSION_SECRET is not configured.');
  }
  return new TextEncoder().encode(secret);
}

export async function createPortalSessionToken(
  payload: PortalSessionPayload,
): Promise<string> {
  return new SignJWT({
    portalClientId: payload.portalClientId,
    kind: payload.kind,
    ...(payload.awbNumber ? { awbNumber: payload.awbNumber } : {}),
    ...(payload.clientName ? { clientName: payload.clientName } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyPortalSessionToken(
  token: string,
): Promise<PortalSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const portalClientId = payload.portalClientId;
    if (typeof portalClientId !== 'string' || !portalClientId.trim()) {
      return null;
    }

    const kind: PortalSessionKind =
      payload.kind === 'account' ? 'account' : 'awb';
    const awbNumber =
      typeof payload.awbNumber === 'string' && payload.awbNumber.trim()
        ? payload.awbNumber
        : undefined;
    const clientName =
      typeof payload.clientName === 'string' && payload.clientName.trim()
        ? payload.clientName
        : undefined;

    if (kind === 'awb' && !awbNumber) {
      return null;
    }

    return {
      portalClientId,
      kind,
      awbNumber,
      clientName,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}
