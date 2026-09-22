import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

const STEPS = ['Identification', 'Cargo details', 'Summary'] as const;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    step: { flex: 1, gap: 6 },
    bar: { height: 4, borderRadius: 2, backgroundColor: colors.border.onSurface },
    barActive: { backgroundColor: colors.accent.primary },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
    labelActive: { color: colors.accent.primary },
  });
}

export function FormSectionRail({ activeIndex }: { activeIndex: number }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      {STEPS.map((label, index) => {
        const active = index <= activeIndex;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.bar, active && styles.barActive]} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
