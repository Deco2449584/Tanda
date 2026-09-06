import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { brand } from '@/theme/brand';
import { fonts } from '@/theme/typography';

const logoLight = require('../../assets/brand/logo-light.webp');

type ContinentalInspectLogoProps = {
  width?: number;
  style?: ViewStyle;
  /** onDark = logo on dark backgrounds; onLight = tinted for light backgrounds */
  variant?: 'onDark' | 'onLight';
  /** Show app name text under the mark */
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
  const height = width * (303 / 400);
  const textColor = resolved === 'onLight' ? colors.text.primary : '#FFFFFF';

  return (
    <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel={brand.appName}>
      <Image
        source={logoLight}
        style={{
          width,
          height,
          tintColor: resolved === 'onLight' ? '#000000' : '#FFFFFF',
        }}
        contentFit="contain"
      />
      {showWordmark ? (
        <View style={styles.wordmark}>
          <Text style={[styles.appName, { color: textColor }]}>{brand.appName}</Text>
          <Text
            style={[
              styles.tagline,
              { color: resolved === 'onLight' ? colors.text.onSurfaceMuted : 'rgba(255,255,255,0.75)' },
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
