import { COLLECTIONS } from '@/lib/constants';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import type { UserRole } from '@/lib/auth/roles';
import { getAdminFirestore } from '@/lib/firebase-admin';

export interface EmployeeContext {
  uid: string;
  email: string;
  employeeDocId: string;
  employeeId: string;
  name: string;
  department: string;
  locationId: string;
  role: UserRole;
}

export async function loadEmployeeContext(
  request: Request,
): Promise<EmployeeContext | null> {
  const user = await verifyFirebaseToken(request.headers.get('authorization'));
  if (!user) {
    return null;
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('email', '==', user.email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0]!;
  const data = doc.data();

  return {
    uid: user.uid,
    email: user.email.trim().toLowerCase(),
    employeeDocId: doc.id,
    employeeId: typeof data.employeeId === 'string' ? data.employeeId : '',
    name: typeof data.name === 'string' ? data.name : user.email,
    department: typeof data.department === 'string' ? data.department.trim() : '',
    locationId: typeof data.locationId === 'string' ? data.locationId.trim() : '',
    role: resolveRoleFromEmployee({
      role: typeof data.role === 'string' ? data.role : undefined,
      department: typeof data.department === 'string' ? data.department : undefined,
    }),
  };
}
