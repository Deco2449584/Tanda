import {
  getRequestIp,
  writeAuditLog,
} from '@/lib/audit/server/audit-log-service';
import type { WriteAuditLogInput } from '@/lib/types/audit-log';

export async function recordAuditFromRequest(
  request: Request,
  actor: { email: string; uid: string },
  event: Omit<WriteAuditLogInput, 'actorEmail' | 'actorUid' | 'ipAddress'>,
): Promise<void> {
  try {
    await writeAuditLog({
      ...event,
      actorEmail: actor.email,
      actorUid: actor.uid,
      ipAddress: getRequestIp(request),
    });
  } catch (error) {
    console.error('recordAuditFromRequest', error);
  }
}
