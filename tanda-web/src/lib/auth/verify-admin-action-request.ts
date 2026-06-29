import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import type {
  AdminActionModule,
  AdminActionName,
} from '@/lib/types/admin-permissions';

export async function verifyAdminActionRequest<M extends AdminActionModule>(
  request: Request,
  module: M,
  action: AdminActionName<M>,
): Promise<{ email: string; uid: string } | null> {
  const context = await loadAdminAccessFromRequest(request);
  if (!context) {
    return null;
  }

  if (!canPerformAction(context.access, module, action)) {
    return null;
  }

  return context.user;
}
