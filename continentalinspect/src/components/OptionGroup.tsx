import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT_DIM_STRONG, ACCENT_TINT_LIGHT } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';

type OptionGroupProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  getLabel?: (option: T) => string;
};

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    group: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: isDark ? colors.surface.muted : colors.surface.default,
    },
    chipSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: isDark ? ACCENT_DIM_STRONG : ACCENT_TINT_LIGHT,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text.onSurfaceMuted,
    },
    chipTextSelected: {
      color: colors.accent.primary,
      fontWeight: '700',
    },
  });
}

export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  getLabel = (option) => option,
}: OptionGroupProps<T>) {
  const { isDark } = useTheme();
  const styles = useThemedStyles((colors) => createStyles(colors, isDark));

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(option)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {getLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
