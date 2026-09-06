import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEvidenceMediaPipeline } from '@/context/EvidenceMediaPipelineContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspection } from '@/types';
import { METRIC_ATTENTION, METRIC_LOADED, METRIC_NEW_CARGO } from '@/components/TodayOperationsDonut';
import { getConservationLabel } from '@/utils/cargoLabels';
import { getInspectionDisplayBadge } from '@/utils/cargoInspectionStatus';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  isManualUnitType,
  resolveUnitType,
} from '@/utils/cargoUnitType';
import { formatInspectionDate } from '@/utils/formatDate';

type CargoCardProps = {
  inspection: CargoInspection;
  onPress?: () => void;
};

const THUMB = 48;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    cardPressed: {
      opacity: 0.85,
    },
    accentBar: {
      width: 3,
      backgroundColor: ACCENT,
    },
    body: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
      backgroundColor: colors.surface.muted,
    },
    iconWrap: {
      width: THUMB,
      height: THUMB,
      borderRadius: 8,
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
      letterSpacing: 0.2,
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    pendingBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
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
  const { getInspectionMediaUploadSummary } = useEvidenceMediaPipeline();

  const mediaUploadSummary = getInspectionMediaUploadSummary(inspection.id);

  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;

  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  const displayBadge = getInspectionDisplayBadge(inspection);
  const title = getInspectionDisplayTitle(inspection);
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  const unitTypeLabel = getUnitTypeLabel(unitType);
  const statusBg =
    displayBadge.kind === 'attention'
      ? `${METRIC_ATTENTION}22`
      : displayBadge.kind === 'warehouse'
        ? `${METRIC_NEW_CARGO}22`
        : `${METRIC_LOADED}22`;
  const statusColor =
    displayBadge.kind === 'attention'
      ? METRIC_ATTENTION
      : displayBadge.kind === 'warehouse'
        ? METRIC_NEW_CARGO
        : METRIC_LOADED;
  const statusLabel = displayBadge.label;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.accentBar} />

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
            <View style={styles.iconWrap}>
              <Ionicons name="cube-outline" size={22} color={colors.accent.primary} />
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
            <Text style={styles.conservation} numberOfLines={1}>
              {getConservationLabel(inspection.conservationType)} · {inspection.weightKg} kg ·{' '}
              {inspection.boxCount} boxes
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {inspection.syncStatus === 'pending' ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>PENDING SYNC</Text>
              </View>
            ) : null}
            {mediaUploadSummary?.status === 'pending' ? (
              <View style={styles.mediaProgressWrap}>
                <Text style={styles.mediaProgressLabel}>
                  {mediaUploadSummary.label} {mediaUploadSummary.progress}%
                </Text>
                <View style={styles.mediaProgressTrack}>
                  <View
                    style={[
                      styles.mediaProgressFill,
                      { width: `${mediaUploadSummary.progress}%` },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            {mediaUploadSummary?.status === 'uploaded' ? (
              <View style={styles.uploadedBadge}>
                <Text style={styles.uploadedBadgeText}>{mediaUploadSummary.label}</Text>
              </View>
            ) : null}
            {mediaUploadSummary?.status === 'error' ? (
              <View style={styles.errorBadge}>
                <Text style={styles.errorBadgeText}>{mediaUploadSummary.label}</Text>
              </View>
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
    </Pressable>
  );
}, (previous, next) => {
  return (
    previous.inspection.id === next.inspection.id &&
    previous.inspection.updatedAt === next.inspection.updatedAt &&
    previous.inspection.unitType === next.inspection.unitType &&
    previous.inspection.syncStatus === next.inspection.syncStatus &&
    previous.inspection.hasIssues === next.inspection.hasIssues &&
    previous.onPress === next.onPress
  );
});
