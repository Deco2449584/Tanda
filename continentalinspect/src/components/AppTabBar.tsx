import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT_DIM_TAB } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<string, { label: string; icon: TabIconName; iconFocused: TabIconName }> = {
  index: { label: 'Records', icon: 'albums-outline', iconFocused: 'albums' },
  search: { label: 'Search', icon: 'search-outline', iconFocused: 'search' },
  scan: { label: 'Scan', icon: 'scan-outline', iconFocused: 'scan' },
  admin: { label: 'Admin', icon: 'shield-checkmark-outline', iconFocused: 'shield-checkmark' },
  account: { label: 'Account', icon: 'person-outline', iconFocused: 'person' },
};

function createTabBarStyles(colors: AppColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: colors.border.default,
      paddingTop: 8,
      paddingHorizontal: 12,
    },
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface.elevated,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 6,
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 14,
      gap: 4,
    },
    tabFocused: {
      backgroundColor: ACCENT_DIM_TAB,
    },
    tabPressed: {
      opacity: 0.85,
    },
    iconWrap: {
      width: 36,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    iconWrapFocused: {},
    label: {
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    labelFocused: {
      fontFamily: fonts.bodyMedium,
      fontWeight: '600',
      color: colors.accent.primary,
    },
  });
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createTabBarStyles);
  const { colors } = useTheme();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          if (route.name === 'admin' && !isAdmin) {
            return null;
          }

          const { options } = descriptors[route.key];

          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            label: route.name,
            icon: 'ellipse-outline' as TabIconName,
            iconFocused: 'ellipse' as TabIconName,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabFocused,
                pressed && styles.tabPressed,
              ]}>
              <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
                <Ionicons
                  name={focused ? meta.iconFocused : meta.icon}
                  size={22}
                  color={focused ? colors.accent.primary : colors.text.secondary}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelFocused]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

