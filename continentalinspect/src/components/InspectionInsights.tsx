import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WidgetCard } from '@/components/WidgetCard';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspection } from '@/types';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginBottom: 16,
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
    fill: { height: 8, borderRadius: 4 },
    value: { width: 28, textAlign: 'right', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text.onSurface },
  });
}

const CLIENT_BAR_COLORS = ['#0288D1', '#00897B', '#43A047', '#F59E0B', '#7C4DFF', '#EC4899'];

function colorForClient(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash + char.charCodeAt(0) * 17) % CLIENT_BAR_COLORS.length;
  }
  return CLIENT_BAR_COLORS[hash] ?? CLIENT_BAR_COLORS[0];
}

function trendColor(count: number, max: number): string {
  if (count <= 0 || max <= 0) {
    return '#CBD5E1';
  }
  const ratio = count / max;
  if (ratio < 0.34) return '#7DD3FC';
  if (ratio < 0.67) return '#0288D1';
  return '#0D47A1';
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
      <WidgetCard style={styles.card}>
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
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(8, (count / clientMax) * 100)}%`,
                      backgroundColor: colorForClient(name),
                    },
                  ]}
                />
              </View>
              <Text style={styles.value}>{count}</Text>
            </View>
          ))
        )}
      </WidgetCard>
      <WidgetCard style={styles.card}>
        <Text style={styles.title}>7-day trend</Text>
        {trend.map((day) => (
          <View key={day.label} style={styles.row}>
            <Text style={styles.label}>{day.label}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${day.count === 0 ? 0 : Math.max(8, (day.count / trendMax) * 100)}%`,
                    backgroundColor: trendColor(day.count, trendMax),
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>{day.count}</Text>
          </View>
        ))}
      </WidgetCard>
    </>
  );
}
