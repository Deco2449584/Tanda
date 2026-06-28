import type { HelpTutorialUserRole } from '@/lib/types/help-tutorial';
import type { HelpTutorial } from '@/lib/types/help-tutorial';
import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole } from '@/lib/auth/roles';

export interface TutorialViewerContext {
  role: UserRole;
  department: string;
  locationId: string;
}

export function employeeCanViewTutorial(
  tutorial: Pick<
    HelpTutorial,
    'audience' | 'audienceValue' | 'audienceRoles' | 'published' | 'active'
  >,
  viewer: TutorialViewerContext,
): boolean {
  if (!tutorial.active || !tutorial.published) {
    return false;
  }

  switch (tutorial.audience) {
    case 'all':
      return true;

    case 'userRole': {
      const roles = tutorial.audienceRoles ?? [];
      if (roles.length === 0) return false;
      if (roles.includes(viewer.role as HelpTutorialUserRole)) {
        return true;
      }
      if (roles.includes('admin') && isAdminAreaRole(viewer.role)) {
        return true;
      }
      return false;
    }

    case 'department': {
      const target = tutorial.audienceValue?.trim() ?? '';
      return Boolean(target && viewer.department === target);
    }

    case 'location': {
      const target = tutorial.audienceValue?.trim() ?? '';
      return Boolean(target && viewer.locationId === target);
    }

    default:
      return false;
  }
}
