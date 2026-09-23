import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { useEvidenceMediaPipeline } from '@/context/EvidenceMediaPipelineContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM } from '@/theme/accent';
import { cardShadow, radius } from '@/theme/motion';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspection } from '@/types';
import { METRIC_ATTENTION } from '@/components/TodayOperationsDonut';
import { CONSERVATION_COLORS, CONSERVATION_ICONS, getConservationLabel } from '@/utils/cargoLabels';
import { formatPersonName, getInspectionDisplayBadge, getSyncBadge } from '@/utils/cargoInspectionStatus';
import {
  getCargoTypeIcon,
  getInspectionDisplayTitle,
  getUnitTypeIcon,
  getUnitTypeLabel,
  isManualUnitType,
  resolveUnitType,
} from '@/utils/cargoUnitType';
import { formatInspectionDate } from '@/utils/formatDate';

type CargoCardProps = {
  inspection: CargoInspection;
  onPress?: () => void;
};

const THUMB = 52;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: radius.card,
      marginBottom: 12,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 1.5,
      borderColor: colors.border.onSurface,
      ...cardShadow(colors.background.primary),
    },
    accentBar: {
      width: 3,
      backgroundColor: ACCENT,
    },
    body: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.thumb,
      backgroundColor: colors.surface.muted,
    },
    iconWrap: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.thumb,
      backgroundColor: ACCENT_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainCol: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    uldId: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 17,
      color: colors.text.onSurface,
      letterSpacing: -0.2,
    },
    awb: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      marginTop: 1,
    },
    metaLine: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurface,
      marginTop: 2,
    },
    conservation: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
    metricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    metricChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metricChipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.text.onSurface,
    },
    authorLine: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
    clientThumb: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface.muted,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      flexShrink: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    pendingBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(2, 101, 220, 0.12)',
    },
    pendingBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 9,
      letterSpacing: 0.3,
      color: ACCENT,
      textTransform: 'uppercase',
    },
    date: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
      flexShrink: 1,
      textAlign: 'right',
    },
    mediaHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    mediaProgressTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.surface.muted,
      overflow: 'hidden',
      marginTop: 4,
    },
    mediaProgressFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: ACCENT,
    },
    uploadedBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(34, 197, 94, 0.14)',
    },
    uploadedBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 9,
      letterSpacing: 0.3,
      color: '#16A34A',
      textTransform: 'uppercase',
    },
    errorBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(198, 40, 40, 0.12)',
    },
    errorBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 9,
      letterSpacing: 0.3,
      color: '#C62828',
      textTransform: 'uppercase',
    },
    mediaProgressWrap: {
      minWidth: 72,
      maxWidth: 100,
    },
    mediaProgressLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 9,
      color: ACCENT,
      textTransform: 'uppercase',
    },
    mediaHintText: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.text.onSurfaceMuted,
    },
  });
}

export const CargoCard = memo(function CargoCard({ inspection, onPress }: CargoCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { getInspectionMediaUploadSummary, retryFailedJobsForInspection } =
    useEvidenceMediaPipeline();

  const mediaUploadSummary = getInspectionMediaUploadSummary(inspection.id);

  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;

  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  const displayBadge = getInspectionDisplayBadge(inspection);
  const syncBadge = getSyncBadge(inspection.syncStatus);
  const cloudKind =
    mediaUploadSummary?.status === 'error'
      ? 'error'
      : mediaUploadSummary?.status === 'pending'
        ? 'pending'
        : syncBadge.kind;
  const cloudLabel =
    mediaUploadSummary?.status === 'error'
      ? 'Upload failed'
      : mediaUploadSummary?.status === 'pending'
        ? 'Uploading'
        : syncBadge.label;
  const title = getInspectionDisplayTitle(inspection);
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  const unitTypeLabel = getUnitTypeLabel(unitType);
  const statusColor = displayBadge.color;
  const statusBg = `${statusColor}22`;
  const conservation = CONSERVATION_COLORS[inspection.conservationType];
  const clientInitial = (inspection.clientLocationName?.trim() || 'C').slice(0, 1).toUpperCase();

  return (
    <PressableScale
      style={[styles.card, { borderColor: statusColor }]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={thumbUri}
            />
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: `${statusColor}22` }]}>
              <Ionicons name="cube-outline" size={22} color={statusColor} />
            </View>
          )}

          <View style={styles.mainCol}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.uldId} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.awb} numberOfLines={1}>
                  {isManualUnitType(unitType) && !inspection.uldId.trim()
                    ? unitTypeLabel
                    : `AWB ${inspection.awbNumber}`}
                </Text>
              </View>
              {onPress ? (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.text.onSurfaceMuted}
                />
              ) : null}
            </View>

            <Text style={styles.metaLine} numberOfLines={1}>
              {inspection.foodType}
              {!isManualUnitType(unitType) || inspection.uldId.trim()
                ? ` · ${unitTypeLabel}`
                : ''}
            </Text>
            <View style={styles.metricRow}>
              <View style={styles.metricChip}>
                <Ionicons name={getUnitTypeIcon(unitType)} size={14} color={statusColor} />
                <Text style={styles.metricChipText}>{unitTypeLabel}</Text>
              </View>
              <View style={styles.metricChip}>
                <Ionicons
                  name={getCargoTypeIcon(inspection.foodType)}
                  size={14}
                  color={statusColor}
                />
                <Text style={styles.metricChipText} numberOfLines={1}>
                  {inspection.foodType}
                </Text>
              </View>
              <View style={styles.metricChip}>
                <Ionicons
                  name={CONSERVATION_ICONS[inspection.conservationType]}
                  size={14}
                  color={conservation.text}
                />
                <Text style={[styles.metricChipText, { color: conservation.text }]}>
                  {getConservationLabel(inspection.conservationType)}
                </Text>
              </View>
              <View style={styles.metricChip}>
                <Ionicons name="barbell-outline" size={14} color={colors.text.onSurfaceMuted} />
                <Text style={styles.metricChipText}>{inspection.weightKg} kg</Text>
              </View>
              <View style={styles.metricChip}>
                <Ionicons name="cube-outline" size={14} color={colors.text.onSurfaceMuted} />
                <Text style={styles.metricChipText}>{inspection.boxCount} boxes</Text>
              </View>
              {inspection.clientLocationName?.trim() ? (
                <View style={styles.metricChip}>
                  {inspection.clientPhotoUrl ? (
                    <Image
                      source={{ uri: inspection.clientPhotoUrl }}
                      style={styles.clientThumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.clientThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={styles.metricChipText}>{clientInitial}</Text>
                    </View>
                  )}
                  <Text style={styles.metricChipText} numberOfLines={1}>
                    {inspection.clientLocationName.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.authorLine} numberOfLines={2}>
              Created by {formatPersonName(inspection.createdByName, inspection.createdBy)}
              {inspection.updatedBy || inspection.updatedByName
                ? ` · Edited by ${formatPersonName(inspection.updatedByName, inspection.updatedBy)}`
                : ''}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{displayBadge.label}</Text>
            </View>
            {inspection.hasIssues ? (
              <View style={[styles.statusBadge, { backgroundColor: `${METRIC_ATTENTION}22` }]}>
                <Text style={[styles.statusText, { color: METRIC_ATTENTION }]}>Issues</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.pendingBadge,
                cloudKind === 'synced' && styles.uploadedBadge,
                cloudKind === 'error' && styles.errorBadge,
              ]}>
              <Text
                style={[
                  styles.pendingBadgeText,
                  cloudKind === 'synced' && styles.uploadedBadgeText,
                  cloudKind === 'error' && styles.errorBadgeText,
                ]}>
                {cloudLabel}
              </Text>
            </View>
            {mediaUploadSummary?.status === 'pending' ? (
              <View style={styles.mediaProgressWrap}>
                <Text style={styles.mediaProgressLabel}>
                  {mediaUploadSummary.label} {mediaUploadSummary.progress}%
                </Text>
                <View style={styles.mediaProgressTrack}>
                  <View
                    style={[
                      styles.mediaProgressFill,
                      { width: `${Math.max(mediaUploadSummary.progress, 4)}%` },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            {mediaUploadSummary?.status === 'error' ? (
              <Pressable
                style={styles.errorBadge}
                onPress={(event) => {
                  event.stopPropagation?.();
                  retryFailedJobsForInspection(inspection.id);
                }}
                hitSlop={8}>
                <Text style={styles.errorBadgeText}>{mediaUploadSummary.label}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.mediaHint}>
            {mediaCount > 0 ? (
              <>
                <Ionicons name="attach-outline" size={12} color={colors.text.onSurfaceMuted} />
                <Text style={styles.mediaHintText}>{mediaCount}</Text>
              </>
            ) : null}
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}, (previous, next) => {
  return (
    previous.inspection.id === next.inspection.id &&
    previous.inspection.updatedAt === next.inspection.updatedAt &&
    previous.inspection.unitType === next.inspection.unitType &&
    previous.inspection.syncStatus === next.inspection.syncStatus &&
    previous.inspection.hasIssues === next.inspection.hasIssues &&
    previous.inspection.status === next.inspection.status &&
    previous.inspection.updatedBy === next.inspection.updatedBy &&
    previous.onPress === next.onPress
  );
});
