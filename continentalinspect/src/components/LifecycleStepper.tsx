import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoInspectionStatus } from '@/types';
import {
  STATUS_IDENTIFICATION,
  STATUS_LOADED,
  STATUS_PROCESSED,
  resolveInspectionStatus,
} from '@/utils/cargoInspectionStatus';
import type { CargoInspection } from '@/types';

const STEPS: { status: CargoInspectionStatus; label: string; color: string }[] = [
  { status: 'identification', label: 'Identification', color: STATUS_IDENTIFICATION },
  { status: 'processed', label: 'Processed', color: STATUS_PROCESSED },
  { status: 'loaded', label: 'On truck', color: STATUS_LOADED },
];

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    step: { flex: 1, gap: 6 },
    bar: { height: 4, borderRadius: 2, backgroundColor: colors.border.onSurface },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
    },
  });
}

const ORDER: CargoInspectionStatus[] = ['identification', 'processed', 'loaded'];

export function LifecycleStepper({ inspection }: { inspection: CargoInspection }) {
  const styles = useThemedStyles(createStyles);
  const current = resolveInspectionStatus(inspection);
  const currentIndex = ORDER.indexOf(current);

  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <View key={step.status} style={styles.step}>
            <View style={[styles.bar, reached && { backgroundColor: step.color }]} />
            <Text style={[styles.label, reached && { color: step.color }]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
