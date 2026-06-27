import type { Timestamp } from 'firebase/firestore';

export const AUDIT_ENTITY_TYPES = [
  'attendance_record',
  'employee',
  'settings',
  'admin_role',
  'shift',
  'announcement',
  'leave_request',
  'system',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTION_GROUPS = [
  'attendance',
  'employee',
  'settings',
  'role',
  'announcement',
  'system',
] as const;

export type AuditActionGroup = (typeof AUDIT_ACTION_GROUPS)[number];

export interface AuditLogFirestore {
  actorEmail: string;
  actorUid?: string;
  action: string;
  entityType: AuditEntityType;
  entityId?: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  actorUid?: string;
  action: string;
  entityType: AuditEntityType;
  entityId?: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: number;
}

export interface WriteAuditLogInput {
  actorEmail: string;
  actorUid?: string;
  action: string;
  entityType: AuditEntityType;
  entityId?: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ListAuditLogsInput {
  startDate?: string;
  endDate?: string;
  actionPrefix?: string;
  entityType?: AuditEntityType;
  actorEmail?: string;
  search?: string;
  limit?: number;
}
