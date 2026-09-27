import { StyleSheet, Text, TextInput, View } from 'react-native';

import { SliderTrack } from '@/components/SliderTrack';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type MetricSliderProps = {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text.onSurfaceMuted },
    value: { fontFamily: fonts.headingSemiBold, fontSize: 16, color: colors.text.onSurface },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    input: {
      minWidth: 72,
      textAlign: 'right',
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onSurface,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surface.card,
    },
    track: {
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface.muted,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    fill: {
      position: 'absolute',
      left: 4,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent.primary,
    },
    knob: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: colors.accent.primary,
    },
  });
}

export function MetricSlider({ label, value, max, unit, onChange }: MetricSliderProps) {
  const styles = useThemedStyles(createStyles);
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));

  const updateFromRatio = (nextRatio: number) => {
    const next = Math.round(nextRatio * max);
    onChange(Math.max(0, Math.min(max, next)));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <TextInput
            style={styles.input}
            value={String(value)}
            keyboardType="number-pad"
            selectTextOnFocus
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, '');
              if (!digits) {
                onChange(0);
                return;
              }
              const next = Number(digits);
              onChange(Math.max(0, Math.min(max, Number.isFinite(next) ? next : 0)));
            }}
          />
          <Text style={styles.value}>{unit}</Text>
        </View>
      </View>
      <SliderTrack style={styles.track} onRatioChange={updateFromRatio}>
        <View pointerEvents="none" style={[styles.fill, { width: `${ratio * 100}%` }]} />
        <View
          pointerEvents="none"
          style={[styles.knob, { left: `${ratio * 100}%`, marginLeft: -16 }]}
        />
      </SliderTrack>
    </View>
  );
}
