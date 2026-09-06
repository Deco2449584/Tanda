import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type FormSectionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.surface.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.onSurface,
      backgroundColor: colors.surface.muted,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(2, 101, 220, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
      letterSpacing: 0.2,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      lineHeight: 16,
    },
    body: {
      padding: 16,
      gap: 16,
    },
  });
}

export function FormSectionCard({ icon, title, subtitle, children }: FormSectionCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color="#0265DC" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
