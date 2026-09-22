import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { InspectClientLocation } from '@/services/locationsRepository';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type ClientChipRowProps = {
  clients: InspectClientLocation[];
  selectedId: string;
  onChange: (client: InspectClientLocation | null) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 4 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 6,
      paddingRight: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surface.muted,
      borderWidth: 1.5,
      borderColor: 'transparent',
      maxWidth: 220,
    },
    chipSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    initial: { color: '#FFFFFF', fontFamily: fonts.bodySemiBold, fontSize: 12 },
    name: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text.onSurface },
  });
}

export function ClientChipRow({ clients, selectedId, onChange }: ClientChipRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {clients.map((client) => {
        const selected = client.id === selectedId;
        const initial = client.name.trim().slice(0, 1).toUpperCase() || 'C';
        return (
          <Pressable
            key={client.id}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(selected ? null : client)}>
            <View style={styles.avatar}>
              {client.photoUrl ? (
                <Image source={{ uri: client.photoUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Text style={styles.initial}>{initial}</Text>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {client.name}
            </Text>
            {selected ? <Ionicons name="close" size={14} color="#6B7280" /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
