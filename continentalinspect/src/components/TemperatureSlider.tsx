import { useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
      height: 28,
      borderRadius: 14,
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
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
    },
    hint: { fontFamily: fonts.body, fontSize: 11, color: colors.text.onSurfaceMuted },
  });
}

const STOPS = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

export function TemperatureSlider({ value, onChange }: TemperatureSliderProps) {
  const styles = useThemedStyles(createStyles);
  const widthRef = useRef(1);
  const display = value ?? 4;
  const tone = temperatureColor(display);
  const ratio = temperatureRatio(display);

  const updateFromX = (locationX: number) => {
    const next = Math.round(
      TEMPERATURE_MIN + (locationX / widthRef.current) * (TEMPERATURE_MAX - TEMPERATURE_MIN),
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
      <View
        style={styles.track}
        onLayout={(event) => {
          widthRef.current = Math.max(1, event.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => updateFromX(event.nativeEvent.locationX)}
        onResponderMove={(event) => updateFromX(event.nativeEvent.locationX)}>
        <View style={styles.gradient} pointerEvents="none">
          {STOPS.map((color) => (
            <View key={color} style={[styles.stop, { backgroundColor: color }]} />
          ))}
        </View>
        <View
          style={[styles.knob, { left: `${ratio * 100}%`, marginLeft: -11, borderColor: tone }]}
        />
      </View>
      <Text style={styles.hint}>
        {value == null ? 'Optional — slide or type a reading.' : `${value} °C`}
      </Text>
    </View>
  );
}
