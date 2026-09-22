import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoUnitType } from '@/types';
import { CARGO_UNIT_TYPES, getUnitTypeIcon, getUnitTypeLabel } from '@/utils/cargoUnitType';

type CargoTypeStripProps = {
  value: CargoUnitType;
  onChange: (unitType: CargoUnitType) => void;
};

const TILE_TINT: Record<CargoUnitType, string> = {
  uld: '#0288D1',
  pallet_skid: '#8D6E63',
  lcl: '#00897B',
  loose_cargo: '#F59E0B',
  breakbulk: '#7C4DFF',
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { gap: 10, paddingVertical: 4 },
    tile: {
      width: 92,
      borderRadius: 16,
      padding: 10,
      gap: 8,
      backgroundColor: colors.surface.muted,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    tileSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
    },
    art: {
      height: 64,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.text.onSurface,
      textAlign: 'center',
    },
  });
}

export function CargoTypeStrip({ value, onChange }: CargoTypeStripProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CARGO_UNIT_TYPES.map((unitType) => {
        const selected = unitType === value;
        const tint = TILE_TINT[unitType];
        return (
          <Pressable
            key={unitType}
            style={[styles.tile, selected && styles.tileSelected]}
            onPress={() => onChange(unitType)}>
            <View style={[styles.art, { backgroundColor: `${tint}22` }]}>
              <Ionicons name={getUnitTypeIcon(unitType)} size={28} color={tint} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {getUnitTypeLabel(unitType)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
