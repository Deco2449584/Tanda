import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CargoVideoEvidenceSection } from '@/components/CargoVideoEvidenceSection';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { METRIC_LOADED, METRIC_NEW_CARGO } from '@/components/TodayOperationsDonut';
import { shareCargoInspectionPdf } from '@/utils/cargoInspectionPdf';
import { CONSERVATION_COLORS, getConservationLabel } from '@/utils/cargoLabels';
import { getInspectionDisplayBadge, resolveInspectionStatus } from '@/utils/cargoInspectionStatus';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/utils/cargoUnitType';
import { formatInspectionDate } from '@/utils/formatDate';

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
      gap: 12,
    },
    row: { gap: 4 },
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
      paddingVertical: 15,
      paddingHorizontal: 16,
      borderRadius: 14,
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
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createDetailStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CargoDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createDetailStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { inspections, isLoading, markInspectionAsLoaded, isOnline } = useCargoInspections();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMarkingLoaded, setIsMarkingLoaded] = useState(false);

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

  const performMarkAsLoaded = async () => {
    if (!inspection) return;

    const title = getInspectionDisplayTitle(inspection);
    setIsMarkingLoaded(true);
    try {
      await markInspectionAsLoaded(inspection.id);
      Alert.alert(
        isOnline ? 'On truck' : 'Saved on device',
        isOnline
          ? `${title} has been marked as on the transport truck.`
          : `${title} is marked on truck on this device and will sync when you are back online.`,
      );
    } catch {
      Alert.alert('Update failed', 'Could not mark this cargo as on truck. Please try again.');
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
  const isInWarehouse = operationalStatus === 'new';
  const isOnTruck = operationalStatus === 'loaded' && !inspection.hasIssues;
  const displayBadge = getInspectionDisplayBadge(inspection);

  let statusBg = `${METRIC_NEW_CARGO}22`;
  let statusColor = METRIC_NEW_CARGO;
  let statusLabel = displayBadge.label;
  let showLifecycleBadge = isInWarehouse || inspection.hasIssues;

  if (displayBadge.kind === 'attention') {
    statusBg = 'rgba(245, 158, 11, 0.22)';
    statusColor = colors.semantic.warning;
  } else if (displayBadge.kind === 'truck') {
    showLifecycleBadge = false;
  }

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
            isAdmin ? (
              <Pressable onPress={handleEdit} hitSlop={12} style={styles.headerIconBtn}>
                <Ionicons name="create-outline" size={24} color={colors.accent.primary} />
              </Pressable>
            ) : null
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}>
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
                {showLifecycleBadge ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                ) : null}
                {isOnTruck ? (
                  <View style={styles.fullyLoadedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={METRIC_LOADED} />
                    <Text style={styles.fullyLoadedText}>On truck</Text>
                  </View>
                ) : null}
                {inspection.syncStatus === 'pending' ? (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(2, 101, 220, 0.12)' }]}>
                    <Text style={[styles.statusText, { color: colors.accent.primary }]}>
                      PENDING SYNC
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricTile}>
                  <Text style={styles.metricValue}>{inspection.weightKg} kg</Text>
                  <Text style={styles.metricLabel}>Weight</Text>
                </View>
                <View style={styles.metricTile}>
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

          {isInWarehouse && inspection.hasIssues ? (
            <View style={styles.dispatchWarning}>
              <Text style={styles.dispatchWarningText}>
                This record has open issues. Marking on truck will ask for confirmation.
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsCard}>
            {isInWarehouse ? (
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

            <Pressable
              style={({ pressed }) => [
                styles.pdfBar,
                pressed && !isPdfLoading && styles.pdfBarPressed,
                isPdfLoading && styles.pdfBarDisabled,
              ]}
              onPress={handleExportPdf}
              disabled={isPdfLoading}>
              {isPdfLoading ? (
                <ActivityIndicator color={colors.accent.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={20} color={colors.accent.primary} />
              )}
              <Text style={styles.pdfBarText}>Export inspection PDF</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="list-outline" size={16} color={colors.accent.primary} />
              </View>
              <Text style={styles.cardHeaderTitle}>Shipment details</Text>
            </View>
            <View style={styles.detailsGrid}>
              <DetailRow
                label="Unit type"
                value={getUnitTypeLabel(
                  resolveUnitType(inspection.unitType, inspection.uldId),
                )}
                styles={styles}
              />
              {inspection.uldId.trim() ? (
                <DetailRow label="ULD ID" value={inspection.uldId} styles={styles} />
              ) : null}
              <DetailRow label="AWB" value={inspection.awbNumber} styles={styles} />
              <DetailRow label="Food type" value={inspection.foodType} styles={styles} />
              {inspection.dispatchedAt ? (
                <DetailRow
                  label="Dispatched on truck"
                  value={formatInspectionDate(inspection.dispatchedAt)}
                  styles={styles}
                />
              ) : null}
              {isAdmin ? (
                <DetailRow label="Operator" value={inspection.createdBy} styles={styles} />
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
