import type { Department, DepartmentFirestore } from '@/lib/types/department';

export function mapDepartmentDoc(
  id: string,
  data: DepartmentFirestore,
): Department {
  return {
    id,
    name: typeof data.name === 'string' ? data.name.trim() : '',
    active: data.active !== false,
    createdAt:
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : undefined,
  };
}
