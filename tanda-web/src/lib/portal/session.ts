import { SignJWT, jwtVerify } from 'jose';

export interface PortalSessionPayload {
  awbNumber: string;
  portalClientId: string;
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
    awbNumber: payload.awbNumber,
    portalClientId: payload.portalClientId,
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
    const awbNumber = payload.awbNumber;
    const portalClientId = payload.portalClientId;

    if (typeof awbNumber !== 'string' || typeof portalClientId !== 'string') {
      return null;
    }

    return { awbNumber, portalClientId };
  } catch {
    return null;
  }
}

export function getBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}
