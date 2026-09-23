import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { CargoUnitType } from '@/types';
import { CARGO_UNIT_TYPES, getUnitTypeLabel } from '@/utils/cargoUnitType';

const CARGO_TYPE_IMAGES: Record<CargoUnitType, number> = {
  uld: require('../../assets/cargo-types/uld.png'),
  pallet_skid: require('../../assets/cargo-types/pallet.png'),
  lcl: require('../../assets/cargo-types/lcl.png'),
  loose_cargo: require('../../assets/cargo-types/loose.png'),
  breakbulk: require('../../assets/cargo-types/breakbulk.png'),
};

type CargoTypeStripProps = {
  value: CargoUnitType;
  onChange: (unitType: CargoUnitType) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { gap: 10, paddingVertical: 4 },
    tile: {
      width: 104,
      borderRadius: 16,
      padding: 8,
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
      width: '100%',
      height: 78,
      borderRadius: 12,
      backgroundColor: '#F3F4F6',
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
        return (
          <Pressable
            key={unitType}
            style={[styles.tile, selected && styles.tileSelected]}
            onPress={() => onChange(unitType)}>
            <Image
              source={CARGO_TYPE_IMAGES[unitType]}
              style={styles.art}
              contentFit="cover"
            />
            <Text style={styles.label} numberOfLines={2}>
              {getUnitTypeLabel(unitType)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
