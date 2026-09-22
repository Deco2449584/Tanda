import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { CONSERVATION_TYPES, type ConservationType } from '@/types';
import { CONSERVATION_COLORS, CONSERVATION_ICONS } from '@/utils/cargoLabels';

type ConservationPillsProps = {
  value: ConservationType;
  onChange: (value: ConservationType) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surface.muted,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text.onSurface },
  });
}

export function ConservationPills({ value, onChange }: ConservationPillsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      {CONSERVATION_TYPES.map((type) => {
        const selected = type === value;
        const tone = CONSERVATION_COLORS[type];
        return (
          <Pressable
            key={type}
            style={[
              styles.pill,
              selected && { backgroundColor: tone.bg, borderColor: tone.text },
            ]}
            onPress={() => onChange(type)}>
            <Ionicons name={CONSERVATION_ICONS[type]} size={16} color={tone.text} />
            <Text style={[styles.label, selected && { color: tone.text }]}>{type}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
