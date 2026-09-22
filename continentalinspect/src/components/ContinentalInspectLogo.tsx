import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { brand } from '@/theme/brand';
import { fonts } from '@/theme/typography';

/** Official web horizontal wordmark (transparent bg). */
const logoHorizontal = require('../../assets/brand/logo-horizontal.png');

const HORIZONTAL_ASPECT = 1585 / 443;

type ContinentalInspectLogoProps = {
  width?: number;
  style?: ViewStyle;
  /** Controls wordmark text color when `showWordmark` is set */
  variant?: 'onDark' | 'onLight';
  /** Show app name text under the logo */
  showWordmark?: boolean;
};

export function ContinentalInspectLogo({
  width = 200,
  style,
  variant,
  showWordmark = false,
}: ContinentalInspectLogoProps) {
  const { isDark, colors } = useTheme();
  const resolved = variant ?? (isDark ? 'onDark' : 'onLight');
  const height = width / HORIZONTAL_ASPECT;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel={brand.appName}>
      <Image source={logoHorizontal} style={{ width, height }} contentFit="contain" />
      {showWordmark ? (
        <View style={styles.wordmark}>
          <Text
            style={[
              styles.appName,
              { color: resolved === 'onLight' ? colors.text.primary : '#FFFFFF' },
            ]}>
            {brand.appName}
          </Text>
          <Text
            style={[
              styles.tagline,
              {
                color:
                  resolved === 'onLight' ? colors.text.onSurfaceMuted : 'rgba(255,255,255,0.75)',
              },
            ]}>
            {brand.tagline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  appName: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
  },
});
