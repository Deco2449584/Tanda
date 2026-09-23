import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CargoVideoEvidenceSection } from '@/components/CargoVideoEvidenceSection';
import { LifecycleStepper } from '@/components/LifecycleStepper';
import { InfoModal } from '@/components/InfoModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import {
  useEvidenceMediaPipeline,
  type InspectionMediaUploadSummary,
} from '@/context/EvidenceMediaPipelineContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { persistEvidenceCaptureUri } from '@/services/inspectionPendingMedia';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { METRIC_ATTENTION, METRIC_LOADED } from '@/components/TodayOperationsDonut';
import { shareCargoInspectionPdf } from '@/utils/cargoInspectionPdf';
import { CONSERVATION_COLORS, getConservationLabel } from '@/utils/cargoLabels';
import {
  formatPersonName,
  getInspectionDisplayBadge,
  getSyncBadge,
  resolveInspectionStatus,
} from '@/utils/cargoInspectionStatus';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/utils/cargoUnitType';
import { formatInspectionDate } from '@/utils/formatDate';

function describeRecordRecovery(
  syncStatus: string | undefined,
  media: InspectionMediaUploadSummary | null,
): { title: string; body: string; canRetry?: boolean } | null {
  if (syncStatus === 'local') {
    return {
      title: 'Saved on this phone',
      body: 'Nothing has been uploaded yet. Tap Sync when you have a connection. Closing the app will not delete this record.',
    };
  }
  if (syncStatus === 'error') {
    return {
      title: 'Cloud sync did not finish',
      body: 'The record is still on this phone. Check the connection, then tap Sync. The files are kept until the upload succeeds.',
    };
  }
  if (syncStatus === 'pending') {
    return {
      title: 'Waiting to upload',
      body: 'The phone retries on its own when it is online. You can close the app. This record stays here until the upload finishes.',
    };
  }
  if (media?.status === 'error') {
    return {
      title: 'Upload stopped',
      body: 'The video or photos are still on this phone. A dropped connection does not delete them. Tap Retry upload, or add the files again.',
      canRetry: true,
    };
  }
  return null;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 40;
const PHOTO_HEIGHT = 200;

function createDetailStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background.primary },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, gap: 14 },
    heroCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    heroAccent: {
      height: 4,
      backgroundColor: colors.accent.primary,
    },
    heroInner: {
      padding: 18,
      gap: 12,
    },
    heroEyebrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.1,
      color: colors.accent.primary,
      textTransform: 'uppercase',
    },
    heroUld: {
      fontFamily: fonts.heading,
      fontSize: 26,
      lineHeight: 32,
      color: colors.text.onSurface,
    },
    heroAwb: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      lineHeight: 20,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metricTile: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
    },
    metricValue: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onSurface,
      textAlign: 'center',
    },
    metricLabel: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    actionsCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 18,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    heroMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      marginTop: 4,
    },
    heroDispatched: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: METRIC_LOADED,
      marginTop: 6,
    },
    dispatchWarning: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.45)',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 4,
    },
    dispatchWarningText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurface,
      lineHeight: 18,
    },
    recoveryTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
      marginBottom: 4,
    },
    recoveryActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    recoveryAction: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.accent.primary,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surface.muted,
      overflow: 'hidden',
      marginTop: 10,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.accent.primary,
    },
    recoveryActionText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: '#FFFFFF',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 18,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.onSurface,
    },
    cardHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(2, 101, 220, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    detailsGrid: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface.muted,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    detailIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.card,
    },
    detailCopy: { flex: 1, gap: 2 },
    rowLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rowValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    mapsLink: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.accent.primary,
      textDecorationLine: 'underline',
    },
    sectionLabel: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    issueText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text.onSurface,
    },
    gallery: { gap: 12, paddingVertical: 4 },
    photoWrap: { width: PHOTO_WIDTH, gap: 6 },
    photo: {
      width: PHOTO_WIDTH,
      height: PHOTO_HEIGHT,
      borderRadius: 12,
      backgroundColor: colors.surface.muted,
    },
    photoIndex: { fontSize: 12, color: colors.text.onSurfaceMuted, textAlign: 'center' },
    noMedia: {
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      fontStyle: 'italic',
    },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    notFoundTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    headerIconBtn: { padding: 4 },
    pdfBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
    },
    pdfBarPressed: { backgroundColor: 'rgba(2, 101, 220, 0.08)' },
    pdfBarDisabled: { opacity: 0.6 },
    pdfBarText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.accent.primary,
    },
    dispatchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 18,
      paddingHorizontal: 18,
      borderRadius: 22,
      backgroundColor: METRIC_LOADED,
      shadowColor: METRIC_LOADED,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    dispatchBtnPressed: { opacity: 0.88 },
    dispatchBtnDisabled: { opacity: 0.6 },
    dispatchBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: '#FFFFFF',
    },
    fullyLoadedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: `${METRIC_LOADED}22`,
    },
    fullyLoadedText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: METRIC_LOADED,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
  });
}

function DetailRow({
  label,
  value,
  styles,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createDetailStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CargoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createDetailStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const {
    inspections,
    isLoading,
    markInspectionAsLoaded,
    markInspectionAsProcessed,
    syncLocalDraft,
    isOnline,
  } = useCargoInspections();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMarkingProcessed, setIsMarkingProcessed] = useState(false);
  const [isMarkingLoaded, setIsMarkingLoaded] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const { getInspectionMediaUploadSummary, retryFailedJobsForInspection, enqueueInspectionUploads } =
    useEvidenceMediaPipeline();

  const inspection = useMemo(
    () => inspections.find((item) => item.id === id),
    [inspections, id],
  );

  const handleEdit = () => {
    if (!inspection || !isAdmin) return;
    router.push({
      pathname: '/scanner',
      params: { editId: inspection.id },
    } as Href);
  };

  const performMarkAsProcessed = async () => {
    if (!inspection) return;

    const title = getInspectionDisplayTitle(inspection);
    setIsMarkingProcessed(true);
    try {
      await markInspectionAsProcessed(inspection.id);
      setNotice({
        title: isOnline ? 'Processed' : 'Saved on this phone',
        message: isOnline
          ? `${title} is marked as processed by Continental.`
          : `${title} is marked processed on this phone and will sync when you are back online.`,
      });
    } catch {
      setNotice({
        title: 'Update failed',
        message: 'Could not mark this cargo as processed. Please try again.',
      });
    } finally {
      setIsMarkingProcessed(false);
    }
  };

  const performMarkAsLoaded = async () => {
    if (!inspection) return;

    const title = getInspectionDisplayTitle(inspection);
    setIsMarkingLoaded(true);
    try {
      await markInspectionAsLoaded(inspection.id);
      setNotice({
        title: isOnline ? 'On truck' : 'Saved on this phone',
        message: isOnline
          ? `${title} is marked on truck.`
          : `${title} is marked on truck on this phone and will sync when you are back online.`,
      });
    } catch {
      setNotice({
        title: 'Update failed',
        message: 'Could not mark this cargo as on truck. Please try again.',
      });
    } finally {
      setIsMarkingLoaded(false);
    }
  };

  const handleMarkAsLoaded = () => {
    if (!inspection || isMarkingLoaded) return;

    const title = getInspectionDisplayTitle(inspection);

    if (!inspection.hasIssues) {
      void performMarkAsLoaded();
      return;
    }

    Alert.alert(
      'Dispatch with open issues?',
      `${title} has reported issues. Confirm it is still OK to send on the transport truck.${
        inspection.issueDescription?.trim()
          ? `\n\nIssue: ${inspection.issueDescription.trim()}`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch anyway',
          style: 'destructive',
          onPress: () => void performMarkAsLoaded(),
        },
      ],
    );
  };

  const handleSyncCloud = async () => {
    if (!inspection || isSyncingCloud) return;
    setIsSyncingCloud(true);
    try {
      await syncLocalDraft(inspection.id);
      router.replace('/(tabs)' as Href);
    } catch {
      setNotice({
        title: 'Sync failed',
        message: 'Could not upload this record. It is still on this phone. Try again when the connection is stable.',
      });
      setIsSyncingCloud(false);
    }
  };

  const handleAddEvidence = async (kind: 'photo' | 'video') => {
    if (!inspection || !user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({
        title: 'Photo library',
        message: 'Allow photo library access to attach evidence to this record.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });
    if (result.canceled || result.assets.length === 0) return;

    const uris: string[] = [];
    for (const asset of result.assets) {
      if (!asset.uri) continue;
      try {
        uris.push(await persistEvidenceCaptureUri(asset.uri, kind));
      } catch {
        setNotice({
          title: 'Could not keep a file',
          message: 'One file could not be saved on this phone. Pick it again.',
        });
      }
    }
    if (uris.length === 0) return;

    enqueueInspectionUploads({
      inspectionId: inspection.id,
      userId: user.uid,
      awbLabel: inspection.awbNumber || inspection.uldId,
      photoUris: kind === 'photo' ? uris : [],
      videoUris: kind === 'video' ? uris : [],
    });
  };

  const handleExportPdf = async () => {
    if (!inspection) return;
    setIsPdfLoading(true);
    try {
      await shareCargoInspectionPdf(inspection);
    } catch {
      Alert.alert('PDF failed', 'Could not generate or share the report. Please try again.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!inspection) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
          <ScreenHeader title="Inspection" onBack={() => router.back()} />
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Inspection not found</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const operationalStatus = resolveInspectionStatus(inspection);
  const isIdentification = operationalStatus === 'identification';
  const isProcessed = operationalStatus === 'processed';
  const displayBadge = getInspectionDisplayBadge(inspection);
  const syncBadge = getSyncBadge(inspection.syncStatus);
  const mediaUploadSummary = getInspectionMediaUploadSummary(inspection.id);
  const recoveryNotice = describeRecordRecovery(inspection.syncStatus, mediaUploadSummary);
  const statusBg = `${displayBadge.color}22`;
  const statusColor = displayBadge.color;

  const conservationColors = CONSERVATION_COLORS[inspection.conservationType];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScreenHeader
          title="Cargo inspection"
          subtitle={brand.name}
          onBack={() => router.back()}
          backLabel="Records"
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable onPress={() => void handleExportPdf()} hitSlop={12} style={styles.headerIconBtn}>
                <Ionicons name="document-text-outline" size={22} color={colors.accent.primary} />
              </Pressable>
              {isAdmin ? (
                <Pressable onPress={handleEdit} hitSlop={12} style={styles.headerIconBtn}>
                  <Ionicons name="create-outline" size={22} color={colors.accent.primary} />
                </Pressable>
              ) : null}
            </View>
          }
        />
        <InfoModal
          visible={notice != null}
          icon="alert-circle-outline"
          title={notice?.title ?? ''}
          message={notice?.message ?? ''}
          onConfirm={() => setNotice(null)}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}>
          <LifecycleStepper inspection={inspection} />
          <View style={styles.heroCard}>
            <View style={styles.heroAccent} />
            <View style={styles.heroInner}>
              <Text style={styles.heroEyebrow}>Inspection record</Text>
              <Text style={styles.heroUld}>{getInspectionDisplayTitle(inspection)}</Text>
              <Text style={styles.heroAwb}>
                {getUnitTypeLabel(
                  resolveUnitType(inspection.unitType, inspection.uldId),
                )}{' '}
                · AWB {inspection.awbNumber}
              </Text>

              <View style={styles.chipRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{displayBadge.label}</Text>
                </View>
                {inspection.hasIssues ? (
                  <View style={[styles.statusBadge, { backgroundColor: `${METRIC_ATTENTION}22` }]}>
                    <Text style={[styles.statusText, { color: METRIC_ATTENTION }]}>Issues</Text>
                  </View>
                ) : null}
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(2, 101, 220, 0.12)' }]}>
                  <Text style={[styles.statusText, { color: colors.accent.primary }]}>
                    {mediaUploadSummary?.status === 'error'
                      ? 'Upload failed'
                      : mediaUploadSummary?.status === 'pending'
                        ? 'Uploading'
                        : syncBadge.label}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricTile}>
                  <Ionicons name="barbell-outline" size={16} color={colors.accent.primary} />
                  <Text style={styles.metricValue}>{inspection.weightKg} kg</Text>
                  <Text style={styles.metricLabel}>Weight</Text>
                </View>
                <View style={styles.metricTile}>
                  <Ionicons name="cube-outline" size={16} color={colors.accent.primary} />
                  <Text style={styles.metricValue}>{inspection.boxCount}</Text>
                  <Text style={styles.metricLabel}>Boxes</Text>
                </View>
                <View
                  style={[
                    styles.metricTile,
                    {
                      backgroundColor: conservationColors.bg,
                      borderColor: conservationColors.text + '33',
                    },
                  ]}>
                  <Text style={[styles.metricValue, { color: conservationColors.text, fontSize: 13 }]}>
                    {getConservationLabel(inspection.conservationType)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: conservationColors.text }]}>Cold chain</Text>
                </View>
              </View>

              <Text style={styles.heroMeta}>
                Registered {formatInspectionDate(inspection.registeredAt)}
              </Text>
              {inspection.dispatchedAt ? (
                <Text style={styles.heroDispatched}>
                  On truck since {formatInspectionDate(inspection.dispatchedAt)}
                </Text>
              ) : inspection.updatedAt ? (
                <Text style={styles.heroMeta}>
                  Updated {formatInspectionDate(inspection.updatedAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {mediaUploadSummary?.status === 'pending' ? (
            <View style={styles.dispatchWarning}>
              <Text style={styles.recoveryTitle}>{mediaUploadSummary.label}</Text>
              <Text style={styles.dispatchWarningText}>{mediaUploadSummary.progress}%</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(mediaUploadSummary.progress, 4)}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {recoveryNotice ? (
            <View style={styles.dispatchWarning}>
              <Text style={styles.recoveryTitle}>{recoveryNotice.title}</Text>
              <Text style={styles.dispatchWarningText}>{recoveryNotice.body}</Text>
              {recoveryNotice.canRetry ? (
                <View style={styles.recoveryActions}>
                  <Pressable
                    style={styles.recoveryAction}
                    onPress={() => retryFailedJobsForInspection(inspection.id)}>
                    <Text style={styles.recoveryActionText}>Retry upload</Text>
                  </Pressable>
                  <Pressable
                    style={styles.recoveryAction}
                    onPress={() => void handleAddEvidence('photo')}>
                    <Text style={styles.recoveryActionText}>Add photos</Text>
                  </Pressable>
                  <Pressable
                    style={styles.recoveryAction}
                    onPress={() => void handleAddEvidence('video')}>
                    <Text style={styles.recoveryActionText}>Add videos</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {isProcessed && inspection.hasIssues ? (
            <View style={styles.dispatchWarning}>
              <Text style={styles.dispatchWarningText}>
                This record has open issues. Marking on truck will ask for confirmation.
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsCard}>
            {inspection.syncStatus === 'local' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.dispatchBtn,
                  pressed && !isSyncingCloud && styles.dispatchBtnPressed,
                  isSyncingCloud && styles.dispatchBtnDisabled,
                ]}
                onPress={() => void handleSyncCloud()}
                disabled={isSyncingCloud}>
                {isSyncingCloud ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.dispatchBtnText}>Sync</Text>
                  </>
                )}
              </Pressable>
            ) : null}
            {isIdentification ? (
              <Pressable
                style={({ pressed }) => [
                  styles.dispatchBtn,
                  pressed && !isMarkingProcessed && styles.dispatchBtnPressed,
                  isMarkingProcessed && styles.dispatchBtnDisabled,
                ]}
                onPress={() => void performMarkAsProcessed()}
                disabled={isMarkingProcessed}>
                {isMarkingProcessed ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.dispatchBtnText}>Mark processed</Text>
                  </>
                )}
              </Pressable>
            ) : null}
            {isProcessed ? (
              <Pressable
                style={({ pressed }) => [
                  styles.dispatchBtn,
                  pressed && !isMarkingLoaded && styles.dispatchBtnPressed,
                  isMarkingLoaded && styles.dispatchBtnDisabled,
                ]}
                onPress={handleMarkAsLoaded}
                disabled={isMarkingLoaded}>
                {isMarkingLoaded ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="bus-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.dispatchBtnText}>Mark on truck</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="list-outline" size={16} color={colors.accent.primary} />
              </View>
              <Text style={styles.cardHeaderTitle}>Shipment details</Text>
            </View>
            <View style={styles.detailsGrid}>
              {inspection.clientLocationName?.trim() ? (
                <DetailRow
                  label="Client"
                  value={inspection.clientLocationName.trim()}
                  styles={styles}
                  icon="business-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              <DetailRow
                label="Unit type"
                value={getUnitTypeLabel(
                  resolveUnitType(inspection.unitType, inspection.uldId),
                )}
                styles={styles}
                icon="layers-outline"
                iconColor={colors.accent.primary}
              />
              {inspection.uldId.trim() ? (
                <DetailRow
                  label="Identifier"
                  value={inspection.uldId}
                  styles={styles}
                  icon="barcode-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              <DetailRow
                label="AWB"
                value={inspection.awbNumber}
                styles={styles}
                icon="airplane-outline"
                iconColor={colors.accent.primary}
              />
              <DetailRow
                label="Cargo type"
                value={inspection.foodType}
                styles={styles}
                icon="nutrition-outline"
                iconColor={colors.accent.primary}
              />
              {typeof inspection.temperatureCelsius === 'number' ? (
                <DetailRow
                  label="Temperature"
                  value={`${inspection.temperatureCelsius} °C`}
                  styles={styles}
                  icon="thermometer-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {inspection.exitVehiclePlate?.trim() ? (
                <DetailRow
                  label="Exit vehicle plate"
                  value={inspection.exitVehiclePlate.trim()}
                  styles={styles}
                  icon="car-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {inspection.driverName?.trim() ? (
                <DetailRow
                  label="Driver name"
                  value={inspection.driverName.trim()}
                  styles={styles}
                  icon="person-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {inspection.transportCompany?.trim() ? (
                <DetailRow
                  label="Transport company"
                  value={inspection.transportCompany.trim()}
                  styles={styles}
                  icon="trail-sign-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {inspection.notes?.trim() ? (
                <DetailRow
                  label="Cargo notes"
                  value={inspection.notes.trim()}
                  styles={styles}
                  icon="document-text-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {inspection.registeredMapsUrl?.trim() ? (
                <View style={styles.row}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="map-outline" size={16} color={colors.accent.primary} />
                  </View>
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(inspection.registeredMapsUrl!.trim());
                    }}
                    hitSlop={8}>
                    <Text style={styles.rowLabel}>Location</Text>
                    <Text style={styles.mapsLink}>Open in Maps</Text>
                  </Pressable>
                </View>
              ) : null}
              <DetailRow
                label="Registered at"
                value={formatInspectionDate(inspection.registeredAt)}
                styles={styles}
                icon="time-outline"
                iconColor={colors.accent.primary}
              />
              {inspection.dispatchedAt ? (
                <DetailRow
                  label="Loaded on truck at"
                  value={formatInspectionDate(inspection.dispatchedAt)}
                  styles={styles}
                  icon="bus-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              <DetailRow
                label="Created by"
                value={formatPersonName(inspection.createdByName, inspection.createdBy)}
                styles={styles}
                icon="person-circle-outline"
                iconColor={colors.accent.primary}
              />
              {inspection.updatedBy || inspection.updatedByName ? (
                <DetailRow
                  label="Last edited by"
                  value={formatPersonName(inspection.updatedByName, inspection.updatedBy)}
                  styles={styles}
                  icon="create-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
              {isAdmin ? (
                <DetailRow
                  label="Account email"
                  value={inspection.createdBy || '—'}
                  styles={styles}
                  icon="mail-outline"
                  iconColor={colors.accent.primary}
                />
              ) : null}
            </View>
          </View>

          {inspection.hasIssues ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="warning-outline" size={16} color={colors.semantic.warning} />
                </View>
                <Text style={styles.cardHeaderTitle}>Issue report</Text>
              </View>
              {inspection.issueReportedAt ? (
                <Text style={styles.heroMeta}>
                  Reported {formatInspectionDate(inspection.issueReportedAt)}
                </Text>
              ) : null}
              <Text style={styles.issueText}>
                {inspection.issueDescription?.trim() || 'No description provided.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="camera-outline" size={16} color={colors.accent.primary} />
              </View>
              <Text style={styles.cardHeaderTitle}>
                Photo evidence ({inspection.photoEvidence.length})
              </Text>
            </View>
            {inspection.photoEvidence.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gallery}>
                {inspection.photoEvidence.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                    <Text style={styles.photoIndex}>
                      {index + 1} / {inspection.photoEvidence.length}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noMedia}>No photos attached.</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="videocam-outline" size={16} color={colors.accent.primary} />
              </View>
              <Text style={styles.cardHeaderTitle}>
                Video evidence ({inspection.videoEvidence.length})
              </Text>
            </View>
            {inspection.videoEvidence.length > 0 ? (
              <CargoVideoEvidenceSection videoUrls={inspection.videoEvidence} />
            ) : (
              <Text style={styles.noMedia}>No videos attached.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
