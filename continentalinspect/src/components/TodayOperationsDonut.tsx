import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

export const METRIC_NEW_CARGO = '#0288D1';
export const METRIC_LOADED = '#4CAF50';
export const METRIC_ATTENTION = '#F59E0B';

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type TodayOperationsDonutProps = {
  newCargo: number;
  loaded: number;
};

const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      marginBottom: 22,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
      marginBottom: 14,
      alignSelf: 'flex-start',
    },
    chartRow: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerOverlay: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerValue: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: colors.text.onSurface,
    },
    centerLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    legend: {
      marginTop: 16,
      width: '100%',
      gap: 8,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
    },
    legendValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.onSurface,
    },
    emptyHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}

export function TodayOperationsDonut({ newCargo, loaded }: TodayOperationsDonutProps) {
  const styles = useThemedStyles(createStyles);

  const segments = useMemo<DonutSegment[]>(
    () => [
      { label: 'In warehouse', value: newCargo, color: METRIC_NEW_CARGO },
      { label: 'On truck', value: loaded, color: METRIC_LOADED },
    ],
    [loaded, newCargo],
  );

  const total = newCargo + loaded;
  const isEmpty = total === 0;

  const arcs = useMemo(() => {
    if (isEmpty) return [];

    let offset = 0;
    return segments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const fraction = segment.value / total;
        const length = fraction * CIRCUMFERENCE;
        const dasharray = `${length} ${CIRCUMFERENCE - length}`;
        const dashoffset = -offset;
        offset += length;
        return { ...segment, dasharray, dashoffset };
      });
  }, [isEmpty, segments, total]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Warehouse mix today</Text>

      {isEmpty ? (
        <Text style={styles.emptyHint}>
          No warehouse or truck cargo today yet. Scan a ULD to see the breakdown here.
        </Text>
      ) : (
        <>
          <View style={styles.chartRow}>
            <Svg width={SIZE} height={SIZE}>
              <G rotation="-90" origin={`${CENTER}, ${CENTER}`}>
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={STROKE}
                  fill="none"
                />
                {arcs.map((arc) => (
                  <Circle
                    key={arc.label}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke={arc.color}
                    strokeWidth={STROKE}
                    strokeDasharray={arc.dasharray}
                    strokeDashoffset={arc.dashoffset}
                    strokeLinecap="butt"
                    fill="none"
                  />
                ))}
              </G>
            </Svg>
            <View style={styles.centerOverlay} pointerEvents="none">
              <Text style={styles.centerValue}>{total}</Text>
              <Text style={styles.centerLabel}>Warehouse + truck</Text>
            </View>
          </View>

          <View style={styles.legend}>
            {segments.map((segment) => {
              const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
              return (
                <View key={segment.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <Text style={styles.legendText}>
                    {segment.label} ({pct}%)
                  </Text>
                  <Text style={styles.legendValue}>{segment.value}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
