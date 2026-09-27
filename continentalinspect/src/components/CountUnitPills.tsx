import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  COUNT_UNITS,
  getCountUnitLabel,
  type CargoCountUnit,
} from '@/utils/countUnit';

type CountUnitPillsProps = {
  value: CargoCountUnit;
  onChange: (unit: CargoCountUnit) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 2 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface.muted,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    pillSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.onSurface,
      textTransform: 'capitalize',
    },
    labelSelected: { color: colors.accent.primary },
  });
}

export function CountUnitPills({ value, onChange }: CountUnitPillsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {COUNT_UNITS.map((unit) => {
        const selected = unit === value;
        return (
          <Pressable
            key={unit}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => onChange(unit)}>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {getCountUnitLabel(unit)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
