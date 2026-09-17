import { COLLECTIONS } from '@/lib/constants';
import type { DataPurgeOptions } from '@/lib/admin/data-purge';

export type DataPurgeCategoryKind = 'firestore' | 'storage' | 'auth' | 'action';
export type DataPurgeDateFieldKind = 'timestamp' | 'dateString';
export type DataPurgeRecommendLevel = 'ok' | 'watch' | 'free';
export type DataPurgeCategoryKey = keyof DataPurgeOptions;

export interface DataPurgeCategoryStats {
  kind: DataPurgeCategoryKind;
  label: string;
  dateFilterApplies: boolean;
  docCount: number | null;
  storageBytes: number | null;
  fileCount: number | null;
  oldest: string | null;
  newest: string | null;
  spanDays: number | null;
  recommendFree: DataPurgeRecommendLevel;
}

export interface DataPurgeStatsResult {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string } | null;
  categories: Record<DataPurgeCategoryKey, DataPurgeCategoryStats>;
  totals: {
    docCount: number;
    storageBytes: number;
    fileCount: number;
  };
  partialWarnings: string[];
}

export interface DataPurgeCategoryDef {
  key: DataPurgeCategoryKey;
  label: string;
  kind: DataPurgeCategoryKind;
  /** Firestore collection name when kind is firestore. */
  collection?: string;
  /** GCS prefix when kind is storage (or locations with photos). */
  storagePrefix?: string;
  /** Extra GCS prefix attributed to this category (e.g. location_photos with locations). */
  extraStoragePrefix?: string;
  dateField?: string;
  dateFieldKind?: DataPurgeDateFieldKind;
  dateFilterApplies: boolean;
  /** High-volume Firestore collections for watch/free heuristics. */
  highVolumeDocs?: boolean;
  /** Shown in the stacked storage bar when storageBytes > 0. */
  contributesToStorageBar: boolean;
}

export const DATA_PURGE_CATEGORIES: readonly DataPurgeCategoryDef[] = [
  {
    key: 'attendanceStorage',
    label: 'Attendance photos',
    kind: 'storage',
    storagePrefix: 'attendance',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'attendanceRecords',
    label: 'Attendance records',
    kind: 'firestore',
    collection: COLLECTIONS.ATTENDANCE_RECORDS,
    dateField: 'timestampServer',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    highVolumeDocs: true,
    contributesToStorageBar: false,
  },
  {
    key: 'attendanceJustifications',
    label: 'Attendance justifications',
    kind: 'firestore',
    collection: COLLECTIONS.ATTENDANCE_JUSTIFICATIONS,
    dateField: 'date',
    dateFieldKind: 'dateString',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'resetEmployeePresence',
    label: 'Reset employee presence',
    kind: 'action',
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'shifts',
    label: 'Scheduled shifts',
    kind: 'firestore',
    collection: COLLECTIONS.SHIFTS,
    dateField: 'date',
    dateFieldKind: 'dateString',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'leaveRequests',
    label: 'Leave requests',
    kind: 'firestore',
    collection: COLLECTIONS.LEAVE_REQUESTS,
    dateField: 'startDate',
    dateFieldKind: 'dateString',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'notifications',
    label: 'In-app notifications',
    kind: 'firestore',
    collection: COLLECTIONS.NOTIFICATIONS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    highVolumeDocs: true,
    contributesToStorageBar: false,
  },
  {
    key: 'notificationPreferences',
    label: 'Notification preferences',
    kind: 'firestore',
    collection: COLLECTIONS.NOTIFICATION_PREFERENCES,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'announcements',
    label: 'Announcements',
    kind: 'firestore',
    collection: COLLECTIONS.ANNOUNCEMENTS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'issueReportsStorage',
    label: 'Issue report attachments',
    kind: 'storage',
    storagePrefix: 'issue_reports',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'issueReports',
    label: 'Issue reports',
    kind: 'firestore',
    collection: COLLECTIONS.ISSUE_REPORTS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'helpTutorialsStorage',
    label: 'Help guide media',
    kind: 'storage',
    storagePrefix: 'help_tutorials',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'helpTutorials',
    label: 'Help guides',
    kind: 'firestore',
    collection: COLLECTIONS.HELP_TUTORIALS,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'courseEvidenceStorage',
    label: 'Course evidence',
    kind: 'storage',
    storagePrefix: 'course_evidence',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'courseEnrollments',
    label: 'Course enrollments',
    kind: 'firestore',
    collection: COLLECTIONS.COURSE_ENROLLMENTS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'courses',
    label: 'Courses catalog',
    kind: 'firestore',
    collection: COLLECTIONS.COURSES,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'employeeDocumentsStorage',
    label: 'Employee identity documents',
    kind: 'storage',
    storagePrefix: 'employee_documents',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'clearEmployeeDocumentRefs',
    label: 'Clear passport / visa URL fields',
    kind: 'action',
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'employeeCustomFieldValues',
    label: 'Employee custom field values',
    kind: 'firestore',
    collection: COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'employeeCustomFields',
    label: 'Employee custom field definitions',
    kind: 'firestore',
    collection: COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'accountingPeriodLocks',
    label: 'Accounting period locks',
    kind: 'firestore',
    collection: COLLECTIONS.ACCOUNTING_PERIOD_LOCKS,
    dateField: 'start',
    dateFieldKind: 'dateString',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'authSessions',
    label: 'Auth sessions',
    kind: 'firestore',
    collection: COLLECTIONS.AUTH_SESSIONS,
    dateField: 'updatedAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'orphanedAuthUsers',
    label: 'Orphaned Firebase Auth users',
    kind: 'auth',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'kioskLoginLogs',
    label: 'Kiosk login logs',
    kind: 'firestore',
    collection: COLLECTIONS.KIOSK_LOGIN_LOGS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
  {
    key: 'kioskDevices',
    label: 'Legacy kiosk devices',
    kind: 'firestore',
    collection: COLLECTIONS.KIOSK_DEVICES,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'locationGroups',
    label: 'Location groups',
    kind: 'firestore',
    collection: COLLECTIONS.LOCATION_GROUPS,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'locations',
    label: 'Locations / warehouses',
    kind: 'firestore',
    collection: COLLECTIONS.LOCATIONS,
    extraStoragePrefix: 'location_photos',
    dateFilterApplies: false,
    contributesToStorageBar: true,
  },
  {
    key: 'clearEmployeeLocationRefs',
    label: 'Clear location / group fields',
    kind: 'action',
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'auditLogs',
    label: 'Audit logs',
    kind: 'firestore',
    collection: COLLECTIONS.AUDIT_LOGS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    highVolumeDocs: true,
    contributesToStorageBar: false,
  },
  {
    key: 'portalClients',
    label: 'Legacy portal clients',
    kind: 'firestore',
    collection: COLLECTIONS.PORTAL_CLIENTS,
    dateFilterApplies: false,
    contributesToStorageBar: false,
  },
  {
    key: 'cargoInspectionsStorage',
    label: 'Cargo inspection media',
    kind: 'storage',
    storagePrefix: 'cargo_inspections',
    dateFilterApplies: true,
    contributesToStorageBar: true,
  },
  {
    key: 'cargoInspections',
    label: 'Cargo inspections',
    kind: 'firestore',
    collection: COLLECTIONS.CARGO_INSPECTIONS,
    dateField: 'createdAt',
    dateFieldKind: 'timestamp',
    dateFilterApplies: true,
    contributesToStorageBar: false,
  },
] as const;

export function getDataPurgeCategory(
  key: DataPurgeCategoryKey,
): DataPurgeCategoryDef | undefined {
  return DATA_PURGE_CATEGORIES.find((item) => item.key === key);
}

const MB = 1024 * 1024;

/** Fixed recommendation heuristics from the control-panel plan. */
export function computeRecommendFree(input: {
  kind: DataPurgeCategoryKind;
  storageBytes: number | null;
  spanDays: number | null;
  docCount: number | null;
  highVolumeDocs?: boolean;
}): DataPurgeRecommendLevel {
  if (input.kind === 'action') return 'ok';

  const bytes = input.storageBytes ?? 0;
  const span = input.spanDays ?? 0;
  const docs = input.docCount ?? 0;

  if (bytes >= 100 * MB || (bytes >= 20 * MB && span >= 90)) {
    return 'free';
  }

  if (
    bytes >= 20 * MB ||
    span >= 180 ||
    (input.highVolumeDocs === true && docs >= 5000)
  ) {
    return 'watch';
  }

  return 'ok';
}

export function formatPurgeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatPurgeSpan(spanDays: number | null): string | null {
  if (spanDays === null || !Number.isFinite(spanDays) || spanDays < 0) return null;
  if (spanDays <= 1) return '1 day';
  if (spanDays < 60) return `${Math.round(spanDays)} days`;
  const months = spanDays / 30.44;
  if (months < 24) {
    const rounded = months >= 10 ? Math.round(months) : Math.round(months * 10) / 10;
    return `${rounded} mo`;
  }
  const years = months / 12;
  return `${Math.round(years * 10) / 10} yr`;
}

export function formatPurgeDateLabel(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(`${trimmed.slice(0, 10)}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return trimmed.slice(0, 10);
}
