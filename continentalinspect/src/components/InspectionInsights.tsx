import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radius } from '@/theme/motion';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspection } from '@/types';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginBottom: 16,
      padding: 16,
      borderRadius: radius.card,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      gap: 10,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    label: { width: 110, fontFamily: fonts.body, fontSize: 12, color: colors.text.onSurfaceMuted },
    track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface.muted, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent.primary },
    value: { width: 28, textAlign: 'right', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text.onSurface },
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function InspectionInsights({ inspections }: { inspections: CargoInspection[] }) {
  const styles = useThemedStyles(createStyles);

  const byClient = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inspection of inspections) {
      const name = inspection.clientLocationName?.trim() || 'Unassigned';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [inspections]);

  const trend = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = today - (6 - index) * 24 * 60 * 60 * 1000;
      const label = new Date(day).toLocaleDateString(undefined, { weekday: 'narrow' });
      const count = inspections.filter((inspection) => {
        const registered = new Date(inspection.registeredAt).getTime();
        return startOfDay(new Date(registered)) === day;
      }).length;
      return { label, count };
    });
    return days;
  }, [inspections]);

  const clientMax = Math.max(1, ...byClient.map(([, count]) => count));
  const trendMax = Math.max(1, ...trend.map((day) => day.count));

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Volume by client</Text>
        {byClient.length === 0 ? (
          <Text style={styles.label}>No records yet</Text>
        ) : (
          byClient.map(([name, count]) => (
            <View key={name} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(count / clientMax) * 100}%` }]} />
              </View>
              <Text style={styles.value}>{count}</Text>
            </View>
          ))
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>7-day trend</Text>
        {trend.map((day) => (
          <View key={day.label} style={styles.row}>
            <Text style={styles.label}>{day.label}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(day.count / trendMax) * 100}%` }]} />
            </View>
            <Text style={styles.value}>{day.count}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
