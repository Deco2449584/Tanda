import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  rightElement?: ReactNode;
  /** Light text/icons for camera overlays and dark photos. */
  variant?: 'default' | 'overlay';
};

function createStyles(colors: AppColors, variant: 'default' | 'overlay') {
  const isOverlay = variant === 'overlay';
  const titleColor = isOverlay ? '#FFFFFF' : colors.text.primary;
  const subtitleColor = isOverlay ? 'rgba(255,255,255,0.85)' : colors.text.secondary;
  const backColor = isOverlay ? '#FFFFFF' : colors.text.primary;
  const borderColor = isOverlay ? 'rgba(255,255,255,0.15)' : colors.border.default;
  const backBg = isOverlay ? 'rgba(0,0,0,0.35)' : colors.surface.card;

  return StyleSheet.create({
    wrap: {
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
      backgroundColor: isOverlay ? 'transparent' : colors.background.primary,
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 8,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 8,
      paddingRight: 10,
      paddingLeft: 4,
      borderRadius: 10,
      backgroundColor: backBg,
      borderWidth: isOverlay ? 0 : 1,
      borderColor: colors.border.onSurface,
      minWidth: 44,
    },
    backBtnPressed: {
      opacity: 0.75,
    },
    backLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: backColor,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: titleColor,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: subtitleColor,
    },
    rightSlot: {
      minWidth: 40,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  rightElement,
  variant = 'default',
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, variant));
  const iconColor = variant === 'overlay' ? '#FFFFFF' : colors.text.primary;

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.inner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}>
          <Ionicons name="chevron-back" size={22} color={iconColor} />
          {backLabel ? <Text style={styles.backLabel}>{backLabel}</Text> : null}
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>{rightElement ?? null}</View>
      </View>
    </View>
  );
}
