import { ContinentalInspectLogo } from '@/components/ContinentalInspectLogo';
import { OfflineBanner } from '@/components/OfflineBanner';
import { CargoCard } from '@/components/CargoCard';
import { StatCard } from '@/components/StatCard';
import {
  METRIC_ATTENTION,
  METRIC_LOADED,
  METRIC_NEW_CARGO,
  TodayOperationsDonut,
} from '@/components/TodayOperationsDonut';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getRoleLabel } from '@/services/userRepository';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { countTodayDashboardMetrics } from '@/utils/cargoInspectionStatus';
import { filterInspectionsToday, formatFilterDate, getTodayRange } from '@/utils/filterInspections';

function createIndexStyles(colors: AppColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      gap: 10,
      minHeight: 44,
    },
    headerText: {
      flex: 1,
      justifyContent: 'center',
      gap: 1,
      paddingRight: 8,
    },
    headerLogo: {
      flexShrink: 0,
    },
    greeting: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.text.primary,
      lineHeight: 24,
    },
    headerSubtitle: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.secondary,
      lineHeight: 14,
    },
    adminBadge: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      color: colors.text.mutedOnDark,
      lineHeight: 13,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    errorBanner: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.semantic.error,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
      lineHeight: 18,
    },
    sectionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.primary,
      marginBottom: 4,
    },
    sectionHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.primary,
      textAlign: 'center',
    },
    emptyHint: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    footerLicense: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 20,
      lineHeight: 16,
    },
  });
}

export default function RecordsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createIndexStyles);
  const { user, isAdmin, role, isLoading: authLoading } = useAuth();
  const {
    inspections,
    isLoading: inspectionsLoading,
    isRefreshing,
    isOnline,
    pendingSyncCount,
    error: inspectionsError,
    refreshRecords,
  } = useCargoInspections();
  const todayLabel = useMemo(() => formatFilterDate(getTodayRange().from), []);

  const dailyInspections = useMemo(
    () => filterInspectionsToday(inspections),
    [inspections],
  );

  const counts = useMemo(() => countTodayDashboardMetrics(inspections), [inspections]);

  const isLoading = authLoading || inspectionsLoading;
  const greetingName = user?.email?.split('@')[0] ?? 'Operator';

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={dailyInspections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CargoCard
            inspection={item}
            onPress={() =>
              router.push(`/cargo/${encodeURIComponent(item.id)}` as Href)
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshRecords}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.headerBlock}>
              <View style={styles.headerText}>
                <Text style={styles.greeting} numberOfLines={1}>
                  Hi, {greetingName}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {brand.panelTitle}
                </Text>
                {isAdmin ? (
                  <Text style={styles.adminBadge} numberOfLines={1}>
                    {getRoleLabel(role)} · team view
                  </Text>
                ) : null}
              </View>
              <ContinentalInspectLogo width={100} style={styles.headerLogo} />
            </View>

            <OfflineBanner isOnline={isOnline} pendingCount={pendingSyncCount} />

            <View style={styles.statsRow}>
              <StatCard
                title="In warehouse"
                value={counts.newCargo}
                accentColor={METRIC_NEW_CARGO}
                icon="cube-outline"
              />
              <StatCard
                title="On truck"
                value={counts.loaded}
                accentColor={METRIC_LOADED}
                icon="checkmark-circle-outline"
              />
              <StatCard
                title="Requires attention"
                value={counts.requiresAttention}
                accentColor={METRIC_ATTENTION}
                icon="alert-circle-outline"
              />
            </View>

            <TodayOperationsDonut newCargo={counts.newCargo} loaded={counts.loaded} />

            {inspectionsError ? (
              <Text style={styles.errorBanner}>
                Could not load inspections: {inspectionsError}
              </Text>
            ) : null}

            <Text style={styles.sectionTitle}>Today&apos;s inspections</Text>
            <Text style={styles.sectionHint}>
              {dailyInspections.length > 0
                ? `${dailyInspections.length} inspection(s) on ${todayLabel} · tap a card for details`
                : `No inspections recorded on ${todayLabel} yet`}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No inspections today</Text>
            <Text style={styles.emptyHint}>
              Open the Scan tab to register a ULD, or use Search to find inspections from other
              dates.
            </Text>
          </View>
        }
        ListFooterComponent={<Text style={styles.footerLicense}>{brand.license}</Text>}
      />
    </SafeAreaView>
  );
}
