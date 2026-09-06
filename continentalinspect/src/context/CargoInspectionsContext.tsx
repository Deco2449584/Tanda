import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { useEvidenceMediaPipeline } from '@/context/EvidenceMediaPipelineContext';
import {
  createCargoInspection,
  createCargoInspectionRecord,
  deleteCargoInspection,
  fetchCargoInspectionByUldId,
  findCargoInspectionByUldId,
  markCargoInspectionAsLoaded,
  subscribeToAllCargoInspections,
  subscribeToUserCargoInspections,
  updateCargoInspection,
} from '@/services/cargoInspectionRepository';
import { loadInspectionCache, saveInspectionCache } from '@/services/inspectionLocalCache';
import { persistPendingInspectionMedia, deletePendingInspectionMedia } from '@/services/inspectionPendingMedia';
import {
  createLocalInspectionId,
  enqueuePendingCreate,
  enqueuePendingMarkLoaded,
  findPendingCreateByUldId,
  loadSyncQueue,
  pendingCreateToInspection,
  updatePendingCreateStatus,
  removeSyncQueueItem,
  type PendingInspectionOperation,
} from '@/services/inspectionSyncQueue';
import { syncPendingInspections } from '@/services/inspectionSyncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { areCargoInspectionListsEqual } from '@/utils/cargoInspectionListEqual';
import { resolveInspectionStatus } from '@/utils/cargoInspectionStatus';
import { mergeInspectionsWithPending } from '@/utils/mergeInspectionsWithPending';
import { isFirebaseConfigured } from '@/services/firebaseConfig';
import type {
  CargoInspection,
  NewCargoInspectionInput,
  UpdateCargoInspectionInput,
} from '@/types';

export type { CargoInspection, NewCargoInspectionInput, UpdateCargoInspectionInput };

type CargoInspectionsContextValue = {
  inspections: CargoInspection[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  error: string | null;
  findByUldId: (uldId: string) => CargoInspection | null;
  lookupInspectionByUldId: (uldId: string) => Promise<CargoInspection | null>;
  refreshRecords: () => Promise<void>;
  addInspection: (input: NewCargoInspectionInput) => Promise<CargoInspection>;
  updateInspectionById: (
    inspectionId: string,
    input: UpdateCargoInspectionInput,
  ) => Promise<CargoInspection>;
  markInspectionAsLoaded: (inspectionId: string) => Promise<CargoInspection>;
  deleteInspectionById: (inspectionId: string) => Promise<void>;
};

const CargoInspectionsContext = createContext<CargoInspectionsContextValue | undefined>(
  undefined,
);

export function CargoInspectionsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, profile, isLoading: authLoading } = useAuth();
  const isOnline = useNetworkStatus();
  const { enqueueInspectionUploads } = useEvidenceMediaPipeline();
  const [remoteInspections, setRemoteInspections] = useState<CargoInspection[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingInspectionOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isSyncingRef = useRef(false);

  const inspections = useMemo(
    () => mergeInspectionsWithPending(remoteInspections, pendingQueue),
    [remoteInspections, pendingQueue],
  );

  const pendingSyncCount = pendingQueue.length;

  const reloadPendingQueue = useCallback(async (userId: string) => {
    const queue = await loadSyncQueue(userId);
    setPendingQueue(queue);
    return queue;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setRemoteInspections([]);
      setPendingQueue([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const [cached, queue] = await Promise.all([
        loadInspectionCache(user.uid),
        loadSyncQueue(user.uid),
      ]);
      if (cancelled) {
        return;
      }
      if (cached.length > 0) {
        setRemoteInspections(cached);
      }
      setPendingQueue(queue);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (authLoading || !profile) {
      return;
    }

    if (!isFirebaseConfigured) {
      setRemoteInspections([]);
      setError('Firebase is not configured.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const onData = (nextInspections: CargoInspection[]) => {
      const synced = nextInspections.map((item) => ({
        ...item,
        syncStatus: 'synced' as const,
      }));

      setRemoteInspections((previous) => {
        if (areCargoInspectionListsEqual(previous, synced)) {
          return previous;
        }
        return synced;
      });
      void saveInspectionCache(user.uid, synced);
      setIsLoading(false);
      setError(null);
    };

    const onError = (subscriptionError: Error) => {
      setError(subscriptionError.message);
      setIsLoading(false);
    };

    const unsubscribe = isAdmin
      ? subscribeToAllCargoInspections(onData, onError)
      : subscribeToUserCargoInspections(user.uid, onData, onError);

    return unsubscribe;
  }, [user?.uid, isAdmin, profile?.docId, authLoading]);

  useEffect(() => {
    if (!user?.uid || !isOnline || pendingSyncCount === 0 || isSyncingRef.current) {
      return;
    }

    let cancelled = false;

    (async () => {
      isSyncingRef.current = true;
      try {
        await syncPendingInspections(user.uid, user.email ?? '');
        if (!cancelled) {
          await reloadPendingQueue(user.uid);
        }
      } finally {
        isSyncingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, isOnline, pendingSyncCount, reloadPendingQueue]);

  const refreshRecords = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    setIsRefreshing(true);
    try {
      if (isOnline && pendingSyncCount > 0) {
        await syncPendingInspections(user.uid, user.email ?? '');
        await reloadPendingQueue(user.uid);
      }
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setIsRefreshing(false);
    }
  }, [user?.uid, user?.email, isOnline, pendingSyncCount, reloadPendingQueue]);

  const findByUldId = useCallback(
    (uldId: string) => findCargoInspectionByUldId(inspections, uldId),
    [inspections],
  );

  const lookupInspectionByUldId = useCallback(
    async (uldId: string): Promise<CargoInspection | null> => {
      const local = findCargoInspectionByUldId(inspections, uldId);
      if (local) {
        return local;
      }

      if (isAdmin) {
        return null;
      }

      if (!isOnline) {
        return null;
      }

      try {
        return await fetchCargoInspectionByUldId(uldId);
      } catch {
        return null;
      }
    },
    [inspections, isAdmin, isOnline],
  );

  const addInspection = useCallback(
    async (input: NewCargoInspectionInput): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to save a record.');
      }

      const duplicate = findCargoInspectionByUldId(inspections, input.uldId);
      if (duplicate) {
        throw new Error('DUPLICATE_ULD');
      }

      const pendingDuplicate = findPendingCreateByUldId(pendingQueue, input.uldId);
      if (pendingDuplicate) {
        throw new Error('DUPLICATE_ULD');
      }

      if (!isOnline) {
        const localId = createLocalInspectionId();
        const registeredAt = new Date().toISOString();
        const { photoEvidence, videoEvidence } = await persistPendingInspectionMedia(
          localId,
          input.photoEvidence,
          input.videoEvidence,
        );
        const operation = await enqueuePendingCreate(user.uid, {
          localId,
          userId: user.uid,
          createdBy: user.email ?? '',
          input: {
            ...input,
            photoEvidence,
            videoEvidence,
          },
          status: 'new',
          registeredAt,
        });
        await reloadPendingQueue(user.uid);
        return pendingCreateToInspection(operation);
      }

      const { inspection, pendingPhotoUris, pendingVideoUris } =
        await createCargoInspectionRecord(user.uid, input, user.email ?? '');

      if (pendingPhotoUris.length > 0 || pendingVideoUris.length > 0) {
        enqueueInspectionUploads({
          inspectionId: inspection.id,
          userId: user.uid,
          awbLabel: input.awbNumber.trim() || inspection.uldId,
          photoUris: pendingPhotoUris,
          videoUris: pendingVideoUris,
        });
      }

      setRemoteInspections((prev) => {
        const withoutDuplicate = prev.filter((item) => item.id !== inspection.id);
        const next = [{ ...inspection, syncStatus: 'synced' as const }, ...withoutDuplicate].sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
        );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
      });

      return { ...inspection, syncStatus: 'synced' };
    },
    [user, inspections, pendingQueue, isOnline, reloadPendingQueue, enqueueInspectionUploads],
  );

  const updateInspectionById = useCallback(
    async (
      inspectionId: string,
      input: UpdateCargoInspectionInput,
    ): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = inspections.find((item) => item.id === inspectionId);
      if (!existing) {
        throw new Error('Cargo inspection not found.');
      }

      if (!isOnline || existing.syncStatus === 'pending') {
        throw new Error('OFFLINE_UPDATE_UNSUPPORTED');
      }

      const { photoEvidence, videoEvidence, updatedAtIso } = await updateCargoInspection(
        user.uid,
        inspectionId,
        input,
        user.email ?? existing.createdBy,
        resolveInspectionStatus(existing),
      );

      const updated: CargoInspection = {
        ...existing,
        unitType: input.unitType,
        uldId: input.uldId,
        awbNumber: input.awbNumber.trim(),
        conservationType: input.conservationType,
        foodType: input.foodType.trim(),
        weightKg: input.weightKg,
        boxCount: input.boxCount,
        hasIssues: input.hasIssues,
        status: resolveInspectionStatus(existing),
        issueDescription: input.hasIssues ? input.issueDescription?.trim() : undefined,
        photoEvidence,
        videoEvidence,
        updatedAt: updatedAtIso,
        syncStatus: 'synced',
      };

      setRemoteInspections((prev) => {
        const next = prev
          .map((item) => (item.id === inspectionId ? updated : item))
          .sort(
            (a, b) =>
              new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
      });

      return updated;
    },
    [user, inspections, isOnline],
  );

  const markInspectionAsLoaded = useCallback(
    async (inspectionId: string): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = inspections.find((item) => item.id === inspectionId);
      if (!existing) {
        throw new Error('Cargo inspection not found.');
      }

      const dispatchedAt = new Date().toISOString();

      if (existing.syncStatus === 'pending') {
        await updatePendingCreateStatus(user.uid, existing.id, 'loaded', dispatchedAt);
        await reloadPendingQueue(user.uid);
        return {
          ...existing,
          status: 'loaded',
          syncStatus: 'pending',
          updatedAt: dispatchedAt,
          dispatchedAt,
        };
      }

      if (!isOnline) {
        await enqueuePendingMarkLoaded(user.uid, inspectionId);
        await reloadPendingQueue(user.uid);
        return {
          ...existing,
          status: 'loaded',
          syncStatus: 'pending',
          updatedAt: dispatchedAt,
          dispatchedAt,
        };
      }

      const { updatedAtIso, dispatchedAtIso } = await markCargoInspectionAsLoaded(inspectionId);

      const updated: CargoInspection = {
        ...existing,
        status: 'loaded',
        updatedAt: updatedAtIso,
        dispatchedAt: dispatchedAtIso,
        syncStatus: 'synced',
      };

      setRemoteInspections((prev) => {
        const next = prev
          .map((item) => (item.id === inspectionId ? updated : item))
          .sort(
            (a, b) =>
              new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
      });

      return updated;
    },
    [user, inspections, isOnline, reloadPendingQueue],
  );

  const deleteInspectionById = useCallback(
    async (inspectionId: string): Promise<void> => {
      if (!user) {
        throw new Error('You must be signed in to delete a record.');
      }

      const existing = inspections.find((item) => item.id === inspectionId);
      if (existing?.syncStatus === 'pending') {
        await removeSyncQueueItem(
          user.uid,
          (item) => item.kind === 'create' && item.localId === inspectionId,
        );
        await deletePendingInspectionMedia(inspectionId);
        await reloadPendingQueue(user.uid);
        return;
      }

      if (!isOnline) {
        throw new Error('OFFLINE_DELETE_UNSUPPORTED');
      }

      await deleteCargoInspection(inspectionId);
      setRemoteInspections((prev) => prev.filter((item) => item.id !== inspectionId));
    },
    [user, inspections, isOnline, reloadPendingQueue],
  );

  const value = useMemo(
    () => ({
      inspections,
      isLoading,
      isRefreshing,
      isOnline,
      pendingSyncCount,
      error,
      findByUldId,
      lookupInspectionByUldId,
      refreshRecords,
      addInspection,
      updateInspectionById,
      markInspectionAsLoaded,
      deleteInspectionById,
    }),
    [
      inspections,
      isLoading,
      isRefreshing,
      isOnline,
      pendingSyncCount,
      error,
      findByUldId,
      lookupInspectionByUldId,
      refreshRecords,
      addInspection,
      updateInspectionById,
      markInspectionAsLoaded,
      deleteInspectionById,
    ],
  );

  return (
    <CargoInspectionsContext.Provider value={value}>{children}</CargoInspectionsContext.Provider>
  );
}

export function useCargoInspections(): CargoInspectionsContextValue {
  const context = useContext(CargoInspectionsContext);
  if (!context) {
    throw new Error('useCargoInspections must be used within a CargoInspectionsProvider');
  }
  return context;
}
