import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT } from '@/theme/accent';
import { cardShadow, radius } from '@/theme/motion';
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
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.onSurface,
      ...cardShadow(colors.background.primary),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.thumb,
      backgroundColor: 'rgba(2, 101, 220, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onSurface,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      lineHeight: 16,
    },
    body: {
      paddingHorizontal: 16,
      paddingBottom: 16,
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
          <Ionicons name={icon} size={18} color={ACCENT} />
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
