import * as Linking from 'expo-linking';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { ContinentalInspectLogo } from '@/components/ContinentalInspectLogo';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  getConfiguredAdminEmails,
  getRoleLabel,
  isAdminEmail,
} from '@/services/userRepository';

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scroll: {
      flexGrow: 1,
      padding: 20,
      justifyContent: 'center',
    },
    centerBlock: {
      alignItems: 'center',
      gap: 12,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: colors.text.primary,
      marginTop: 8,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 8,
      textAlign: 'center',
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface.card,
      borderRadius: 14,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    value: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.onSurface,
      marginBottom: 4,
    },
    valueAdmin: {
      color: colors.accent.primary,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    actionBtnPressed: {
      opacity: 0.88,
    },
    actionText: {
      flex: 1,
      gap: 2,
    },
    actionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    actionHint: {
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
    },
    signOutBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    signOutPressed: {
      opacity: 0.85,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.semantic.error,
    },
    hintWarn: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.semantic.warning,
      lineHeight: 18,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      padding: 12,
      borderRadius: 10,
      width: '100%',
    },
    footer: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: 8,
    },
  });
}

export default function AccountScreen() {
  const { user, profile, role, isAdmin, profileSyncFailed, signOut } = useAuth();
  const { colors, isDark, setColorScheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const emailMatchesAdminList = isAdminEmail(user?.email);
  const adminEmailsConfigured = getConfiguredAdminEmails().length > 0;

  const openSupport = async () => {
    const url = brand.website;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        'Support',
        `Call ${brand.phone} or visit ${brand.websiteDisplay}`,
      );
      return;
    }
    await Linking.openURL(url);
  };

  const callSupport = () => {
    Linking.openURL(`tel:${brand.phoneDial}`);
  };

  const onDarkModeChange = useCallback(
    (enabled: boolean) => {
      setColorScheme(enabled ? 'dark' : 'light');
    },
    [setColorScheme],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.centerBlock}>
          <ContinentalInspectLogo width={160} />
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>
            {brand.panelTitle} · {brand.location}
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{profile?.name ?? '—'}</Text>

            <Text style={styles.label}>Employee ID</Text>
            <Text style={styles.value}>{profile?.employeeId ?? '—'}</Text>

            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{profile?.department ?? '—'}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email ?? profile?.email ?? '—'}</Text>

            <Text style={styles.label}>Access level</Text>
            <View style={styles.roleRow}>
              <Ionicons
                name={isAdmin ? 'shield-checkmark' : 'person-circle-outline'}
                size={18}
                color={isAdmin ? colors.accent.primary : colors.text.onSurfaceMuted}
              />
              <Text style={[styles.value, isAdmin && styles.valueAdmin]}>
                {getRoleLabel(role)}
              </Text>
            </View>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{profile?.active ? 'Active' : 'Inactive'}</Text>
          </View>

          {profileSyncFailed ? (
            <Text style={styles.hintWarn}>
              Could not load your employee record from Firestore. Check rules and connectivity.
            </Text>
          ) : null}

          {!isAdmin && emailMatchesAdminList && adminEmailsConfigured ? (
            <Text style={styles.hintWarn}>
              Your email is in the admin override list but your department is not admin/logistica.
            </Text>
          ) : null}

          <View style={styles.actionBtn}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny-outline'}
              size={22}
              color={colors.accent.primary}
            />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Dark mode</Text>
              <Text style={styles.actionHint}>
                {isDark ? 'Black background (default)' : 'Light background'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={onDarkModeChange}
              trackColor={{
                false: colors.border.onSurface,
                true: colors.accent.primary,
              }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle dark mode"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={openSupport}>
            <Ionicons name="help-circle-outline" size={22} color={colors.accent.primary} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Help & support</Text>
              <Text style={styles.actionHint}>{brand.websiteDisplay}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.text.onSurfaceMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={callSupport}>
            <Ionicons name="call-outline" size={22} color={colors.accent.primary} />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Call support</Text>
              <Text style={styles.actionHint}>{brand.phone}</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}
            onPress={signOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.semantic.error} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={styles.footer}>{brand.license}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
