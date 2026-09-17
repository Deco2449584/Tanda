import {
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {
  computeRecommendFree,
  DATA_PURGE_CATEGORIES,
  type DataPurgeCategoryDef,
  type DataPurgeCategoryKey,
  type DataPurgeCategoryStats,
  type DataPurgeStatsResult,
} from '@/lib/admin/data-purge-catalog';
import {
  hasDateRangeFilter,
  type DataPurgeDateRange,
} from '@/lib/admin/data-purge';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminAuth, getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';

const BATCH_SIZE = 400;

export type { DataPurgeCategoryStats, DataPurgeStatsResult };

function normalizeRange(range?: DataPurgeDateRange | null): {
  startDate: string | null;
  endDate: string | null;
} {
  return {
    startDate: range?.startDate?.trim() || null,
    endDate: range?.endDate?.trim() || null,
  };
}

function toStartTimestamp(dateKey: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateKey}T00:00:00.000Z`));
}

function toEndTimestamp(dateKey: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateKey}T23:59:59.999Z`));
}

function applyDateFilter(
  query: Query,
  def: DataPurgeCategoryDef,
  startDate: string | null,
  endDate: string | null,
): Query {
  if (!def.dateFilterApplies || !def.dateField || !def.dateFieldKind) {
    return query;
  }
  if (!startDate && !endDate) return query;

  let next = query;
  if (def.dateFieldKind === 'timestamp') {
    if (startDate) next = next.where(def.dateField, '>=', toStartTimestamp(startDate));
    if (endDate) next = next.where(def.dateField, '<=', toEndTimestamp(endDate));
  } else {
    if (startDate) next = next.where(def.dateField, '>=', startDate);
    if (endDate) next = next.where(def.dateField, '<=', endDate);
  }
  return next;
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    return trimmed;
  }
  return null;
}

function toSortableMs(value: string | null): number | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T12:00:00.000Z`);
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function computeSpanDays(oldest: string | null, newest: string | null): number | null {
  const a = toSortableMs(oldest);
  const b = toSortableMs(newest);
  if (a === null || b === null) return null;
  const diff = Math.max(0, b - a);
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function emptyStats(def: DataPurgeCategoryDef): DataPurgeCategoryStats {
  return {
    kind: def.kind,
    label: def.label,
    dateFilterApplies: def.dateFilterApplies,
    docCount: def.kind === 'action' || def.kind === 'storage' ? null : 0,
    storageBytes: def.kind === 'storage' || def.extraStoragePrefix ? 0 : null,
    fileCount: def.kind === 'storage' || def.extraStoragePrefix ? 0 : null,
    oldest: null,
    newest: null,
    spanDays: null,
    recommendFree: 'ok',
  };
}

function fileTimeInRange(
  timeCreated: string | undefined,
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (!startDate && !endDate) return true;
  if (!timeCreated) return false;
  const ms = Date.parse(timeCreated);
  if (!Number.isFinite(ms)) return false;
  if (startDate) {
    const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
    if (ms < startMs) return false;
  }
  if (endDate) {
    const endMs = Date.parse(`${endDate}T23:59:59.999Z`);
    if (ms > endMs) return false;
  }
  return true;
}

async function scanStoragePrefix(
  rootPath: string,
  startDate: string | null,
  endDate: string | null,
): Promise<{ bytes: number; files: number; oldest: string | null; newest: string | null }> {
  const bucket = getAdminStorage().bucket();
  const prefix = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
  const [files] = await bucket.getFiles({ prefix });

  let bytes = 0;
  let count = 0;
  let oldestMs: number | null = null;
  let newestMs: number | null = null;
  let oldestIso: string | null = null;
  let newestIso: string | null = null;

  for (const file of files) {
    const meta = file.metadata as { size?: string | number; timeCreated?: string };
    const timeCreated =
      typeof meta.timeCreated === 'string' ? meta.timeCreated : undefined;
    if (!fileTimeInRange(timeCreated, startDate, endDate)) continue;

    const sizeRaw = meta.size;
    const size =
      typeof sizeRaw === 'number'
        ? sizeRaw
        : typeof sizeRaw === 'string'
          ? Number(sizeRaw)
          : 0;
    if (Number.isFinite(size) && size > 0) bytes += size;
    count += 1;

    if (timeCreated) {
      const ms = Date.parse(timeCreated);
      if (Number.isFinite(ms)) {
        if (oldestMs === null || ms < oldestMs) {
          oldestMs = ms;
          oldestIso = new Date(ms).toISOString();
        }
        if (newestMs === null || ms > newestMs) {
          newestMs = ms;
          newestIso = new Date(ms).toISOString();
        }
      }
    }
  }

  return { bytes, files: count, oldest: oldestIso, newest: newestIso };
}

async function firestoreDocCount(
  def: DataPurgeCategoryDef,
  startDate: string | null,
  endDate: string | null,
): Promise<number> {
  if (!def.collection) return 0;
  const db = getAdminFirestore();
  let query: Query = db.collection(def.collection);
  query = applyDateFilter(query, def, startDate, endDate);
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

async function firestoreDateBounds(
  def: DataPurgeCategoryDef,
  startDate: string | null,
  endDate: string | null,
): Promise<{ oldest: string | null; newest: string | null }> {
  if (!def.collection || !def.dateField || !def.dateFieldKind) {
    return { oldest: null, newest: null };
  }

  const db = getAdminFirestore();
  const field = def.dateField;

  async function edge(direction: 'asc' | 'desc'): Promise<string | null> {
    let query: Query = db.collection(def.collection!);
    query = applyDateFilter(query, def, startDate, endDate);
    query = query.orderBy(field, direction).limit(1);
    const snap = await query.get();
    if (snap.empty) return null;
    return timestampToIso(snap.docs[0]?.data()?.[field]);
  }

  const [oldest, newest] = await Promise.all([edge('asc'), edge('desc')]);
  return { oldest, newest };
}

async function collectEmployeeEmails(): Promise<Set<string>> {
  const db = getAdminFirestore();
  const emails = new Set<string>();
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection(COLLECTIONS.EMPLOYEES).orderBy('__name__').limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const email = doc.data()?.email;
      if (typeof email === 'string' && email.trim()) {
        emails.add(email.trim().toLowerCase());
      }
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < BATCH_SIZE) break;
  }

  return emails;
}

async function scanOrphanedAuthUsers(
  startDate: string | null,
  endDate: string | null,
): Promise<{ count: number; oldest: string | null; newest: string | null }> {
  const auth = getAdminAuth();
  const employeeEmails = await collectEmployeeEmails();

  let count = 0;
  let oldestMs: number | null = null;
  let newestMs: number | null = null;
  let oldestIso: string | null = null;
  let newestIso: string | null = null;
  let pageToken: string | undefined;

  do {
    const list = await auth.listUsers(1000, pageToken);
    for (const user of list.users) {
      const email = user.email?.trim().toLowerCase() ?? '';
      if (!email || employeeEmails.has(email)) continue;

      const created = user.metadata.creationTime;
      if (!fileTimeInRange(created, startDate, endDate)) continue;

      count += 1;
      if (created) {
        const ms = Date.parse(created);
        if (Number.isFinite(ms)) {
          if (oldestMs === null || ms < oldestMs) {
            oldestMs = ms;
            oldestIso = new Date(ms).toISOString();
          }
          if (newestMs === null || ms > newestMs) {
            newestMs = ms;
            newestIso = new Date(ms).toISOString();
          }
        }
      }
    }
    pageToken = list.pageToken;
  } while (pageToken);

  return { count, oldest: oldestIso, newest: newestIso };
}

function finalizeStats(
  def: DataPurgeCategoryDef,
  partial: Omit<DataPurgeCategoryStats, 'recommendFree' | 'spanDays' | 'kind' | 'label' | 'dateFilterApplies'> & {
    spanDays?: number | null;
  },
): DataPurgeCategoryStats {
  const spanDays =
    partial.spanDays ?? computeSpanDays(partial.oldest, partial.newest);
  const recommendFree = computeRecommendFree({
    kind: def.kind,
    storageBytes: partial.storageBytes,
    spanDays,
    docCount: partial.docCount,
    highVolumeDocs: def.highVolumeDocs,
  });

  return {
    kind: def.kind,
    label: def.label,
    dateFilterApplies: def.dateFilterApplies,
    docCount: partial.docCount,
    storageBytes: partial.storageBytes,
    fileCount: partial.fileCount,
    oldest: partial.oldest,
    newest: partial.newest,
    spanDays,
    recommendFree,
  };
}

export async function loadDataPurgeStats(
  dateRange?: DataPurgeDateRange | null,
): Promise<DataPurgeStatsResult> {
  const { startDate, endDate } = normalizeRange(dateRange);
  const filterActive = hasDateRangeFilter(dateRange);
  const partialWarnings: string[] = [];
  const categories = {} as Record<DataPurgeCategoryKey, DataPurgeCategoryStats>;

  if (filterActive && startDate && endDate && startDate > endDate) {
    throw new Error('Date filter: "From" must be on or before "To".');
  }

  // Firestore categories in parallel.
  await Promise.all(
    DATA_PURGE_CATEGORIES.filter((def) => def.kind === 'firestore').map(async (def) => {
      try {
        const appliesFilter = def.dateFilterApplies && filterActive;
        const rangeStart = appliesFilter ? startDate : null;
        const rangeEnd = appliesFilter ? endDate : null;

        const [docCount, bounds] = await Promise.all([
          firestoreDocCount(def, rangeStart, rangeEnd),
          def.dateField
            ? firestoreDateBounds(def, rangeStart, rangeEnd)
            : Promise.resolve({ oldest: null, newest: null }),
        ]);

        let storageBytes: number | null = null;
        let fileCount: number | null = null;
        let oldest = bounds.oldest;
        let newest = bounds.newest;

        if (def.extraStoragePrefix) {
          const storage = await scanStoragePrefix(
            def.extraStoragePrefix,
            filterActive ? startDate : null,
            filterActive ? endDate : null,
          );
          storageBytes = storage.bytes;
          fileCount = storage.files;
          if (!oldest || (storage.oldest && toSortableMs(storage.oldest)! < (toSortableMs(oldest) ?? Infinity))) {
            oldest = storage.oldest ?? oldest;
          }
          if (!newest || (storage.newest && toSortableMs(storage.newest)! > (toSortableMs(newest) ?? -Infinity))) {
            newest = storage.newest ?? newest;
          }
        }

        categories[def.key] = finalizeStats(def, {
          docCount,
          storageBytes,
          fileCount,
          oldest,
          newest,
        });
      } catch (error) {
        partialWarnings.push(
          `${def.label}: ${error instanceof Error ? error.message : 'Could not load stats.'}`,
        );
        categories[def.key] = emptyStats(def);
      }
    }),
  );

  // Storage prefixes sequentially (low pressure on GCS).
  for (const def of DATA_PURGE_CATEGORIES.filter((item) => item.kind === 'storage')) {
    try {
      if (!def.storagePrefix) {
        categories[def.key] = emptyStats(def);
        continue;
      }
      const storage = await scanStoragePrefix(
        def.storagePrefix,
        filterActive ? startDate : null,
        filterActive ? endDate : null,
      );
      categories[def.key] = finalizeStats(def, {
        docCount: null,
        storageBytes: storage.bytes,
        fileCount: storage.files,
        oldest: storage.oldest,
        newest: storage.newest,
      });
    } catch (error) {
      partialWarnings.push(
        `${def.label}: ${error instanceof Error ? error.message : 'Could not load storage stats.'}`,
      );
      categories[def.key] = emptyStats(def);
    }
  }

  // Auth orphans.
  for (const def of DATA_PURGE_CATEGORIES.filter((item) => item.kind === 'auth')) {
    try {
      const orphans = await scanOrphanedAuthUsers(
        filterActive ? startDate : null,
        filterActive ? endDate : null,
      );
      categories[def.key] = finalizeStats(def, {
        docCount: orphans.count,
        storageBytes: null,
        fileCount: null,
        oldest: orphans.oldest,
        newest: orphans.newest,
      });
    } catch (error) {
      partialWarnings.push(
        `${def.label}: ${error instanceof Error ? error.message : 'Could not scan Auth users.'}`,
      );
      categories[def.key] = emptyStats(def);
    }
  }

  // Actions — no inventory.
  for (const def of DATA_PURGE_CATEGORIES.filter((item) => item.kind === 'action')) {
    categories[def.key] = finalizeStats(def, {
      docCount: null,
      storageBytes: null,
      fileCount: null,
      oldest: null,
      newest: null,
      spanDays: null,
    });
  }

  let totalDocs = 0;
  let totalBytes = 0;
  let totalFiles = 0;

  for (const def of DATA_PURGE_CATEGORIES) {
    const stats = categories[def.key];
    if (!stats) continue;
    if (typeof stats.docCount === 'number') totalDocs += stats.docCount;
    if (typeof stats.storageBytes === 'number') totalBytes += stats.storageBytes;
    if (typeof stats.fileCount === 'number') totalFiles += stats.fileCount;
  }

  return {
    generatedAt: new Date().toISOString(),
    dateRange: filterActive
      ? { startDate: startDate ?? '', endDate: endDate ?? '' }
      : null,
    categories,
    totals: {
      docCount: totalDocs,
      storageBytes: totalBytes,
      fileCount: totalFiles,
    },
    partialWarnings,
  };
}
