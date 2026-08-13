import { NextResponse } from 'next/server';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import type { AdminActionName } from '@/lib/types/admin-permissions';
import type { ResolvedAdminAccess } from '@/lib/types/admin-permissions';

export async function requireAccountingAccess(
  request: Request,
  action?: AdminActionName<'accounting'>,
): Promise<
  | { ok: true; user: { email: string; uid: string }; access: ResolvedAdminAccess }
  | { ok: false; response: NextResponse }
> {
  const context = await loadAdminAccessFromRequest(request);
  if (!context) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
    };
  }

  if (!context.access.modules.accounting && !context.access.isMaster) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    };
  }

  if (action && !canPerformAction(context.access, 'accounting', action)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    };
  }

  return { ok: true, user: context.user, access: context.access };
}
