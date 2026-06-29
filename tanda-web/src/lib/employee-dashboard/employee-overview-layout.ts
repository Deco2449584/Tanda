const STORAGE_KEY = 'tanda-employee-overview-layout-v1';

export const EMPLOYEE_OVERVIEW_SECTIONS = [
  'employee-id',
  'weekly-hours',
  'monthly-hours',
  'next-shift',
  'weekly-schedule',
  'upcoming-shifts',
] as const;

export type EmployeeOverviewSectionId = (typeof EMPLOYEE_OVERVIEW_SECTIONS)[number];

export interface EmployeeOverviewLayoutState {
  collapsedSections: EmployeeOverviewSectionId[];
}

const ALLOWED = new Set<string>(EMPLOYEE_OVERVIEW_SECTIONS);

function createDefaultLayout(): EmployeeOverviewLayoutState {
  return { collapsedSections: [] };
}

function sanitizeSections(ids: string[]): EmployeeOverviewSectionId[] {
  const seen = new Set<string>();
  const result: EmployeeOverviewSectionId[] = [];

  ids.forEach((id) => {
    if (!ALLOWED.has(id) || seen.has(id)) return;
    seen.add(id);
    result.push(id as EmployeeOverviewSectionId);
  });

  return result;
}

export function loadEmployeeOverviewLayout(): EmployeeOverviewLayoutState {
  if (typeof window === 'undefined') {
    return createDefaultLayout();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultLayout();

    const parsed = JSON.parse(raw) as Partial<EmployeeOverviewLayoutState>;
    return {
      collapsedSections: sanitizeSections(parsed.collapsedSections ?? []),
    };
  } catch {
    return createDefaultLayout();
  }
}

export function saveEmployeeOverviewLayout(state: EmployeeOverviewLayoutState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
