import { StyleSheet, Text, TextInput, View } from 'react-native';

import { SliderTrack } from '@/components/SliderTrack';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
  temperatureColor,
  temperatureRatio,
} from '@/utils/temperatureColor';

type TemperatureSliderProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text.onSurfaceMuted },
    value: { fontFamily: fonts.headingSemiBold, fontSize: 16 },
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
      justifyContent: 'center',
      overflow: 'hidden',
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
    },
    stop: { flex: 1 },
    knob: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
    },
    hint: { fontFamily: fonts.body, fontSize: 11, color: colors.text.onSurfaceMuted },
  });
}

const STOPS = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

export function TemperatureSlider({ value, onChange }: TemperatureSliderProps) {
  const styles = useThemedStyles(createStyles);
  const display = value ?? 4;
  const tone = temperatureColor(display);
  const ratio = temperatureRatio(display);

  const updateFromRatio = (nextRatio: number) => {
    const next = Math.round(
      TEMPERATURE_MIN + nextRatio * (TEMPERATURE_MAX - TEMPERATURE_MIN),
    );
    onChange(Math.max(TEMPERATURE_MIN, Math.min(TEMPERATURE_MAX, next)));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>Temperature (°C)</Text>
        <View style={styles.valueRow}>
          <TextInput
            style={styles.input}
            value={value == null ? '' : String(value)}
            keyboardType="numbers-and-punctuation"
            placeholder="—"
            selectTextOnFocus
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.-]/g, '');
              if (!cleaned || cleaned === '-' || cleaned === '.') {
                onChange(null);
                return;
              }
              const next = Number(cleaned);
              if (!Number.isFinite(next)) {
                onChange(null);
                return;
              }
              onChange(Math.max(TEMPERATURE_MIN, Math.min(TEMPERATURE_MAX, Math.round(next))));
            }}
          />
          <Text style={[styles.value, { color: tone }]}>°C</Text>
        </View>
      </View>
      <SliderTrack style={styles.track} onRatioChange={updateFromRatio}>
        <View style={styles.gradient} pointerEvents="none">
          {STOPS.map((color) => (
            <View key={color} style={[styles.stop, { backgroundColor: color }]} />
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[styles.knob, { left: `${ratio * 100}%`, marginLeft: -16, borderColor: tone }]}
        />
      </SliderTrack>
      <Text style={styles.hint}>
        {value == null ? 'Optional — slide or type a reading.' : `${value} °C`}
      </Text>
    </View>
  );
}
