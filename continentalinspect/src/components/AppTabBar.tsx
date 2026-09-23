import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { motion, radius } from '@/theme/motion';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<string, { label: string; icon: TabIconName; iconFocused: TabIconName }> = {
  index: { label: 'Records', icon: 'albums-outline', iconFocused: 'albums' },
  search: { label: 'Search', icon: 'search-outline', iconFocused: 'search' },
  scan: { label: 'New', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  admin: { label: 'Admin', icon: 'shield-checkmark-outline', iconFocused: 'shield-checkmark' },
  account: { label: 'Account', icon: 'person-outline', iconFocused: 'person' },
};

function createTabBarStyles(colors: AppColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.primary,
      paddingTop: 6,
      paddingHorizontal: 16,
    },
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface.elevated,
      borderRadius: radius.card + 6,
      paddingVertical: 6,
      paddingHorizontal: 6,
      gap: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 16,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: radius.control,
      gap: 3,
      overflow: 'hidden',
    },
    iconWrap: {
      width: 36,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.text.secondary,
      letterSpacing: 0.2,
    },
    labelFocused: {
      fontFamily: fonts.bodySemiBold,
      color: colors.accent.primary,
    },
  });
}

function AnimatedTab({
  focused,
  label,
  icon,
  iconFocused,
  onPress,
  accessibilityLabel,
}: {
  focused: boolean;
  label: string;
  icon: TabIconName;
  iconFocused: TabIconName;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const styles = useThemedStyles(createTabBarStyles);
  const { colors } = useTheme();
  const focus = useSharedValue(focused ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: motion.pressOut });
  }, [focus, focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      ['rgba(2, 101, 220, 0)', 'rgba(2, 101, 220, 0.14)'],
    ),
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(motion.pressScale, { duration: motion.pressIn });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.pressOut });
      }}
      style={styles.tab}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radius.control }, animatedStyle]} />
      <View style={styles.iconWrap}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? colors.accent.primary : colors.text.secondary}
        />
      </View>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createTabBarStyles);
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
            <AnimatedTab
              key={route.key}
              focused={focused}
              label={meta.label}
              icon={meta.icon}
              iconFocused={meta.iconFocused}
              onPress={onPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}
