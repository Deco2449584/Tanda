import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CargoCard } from '@/components/CargoCard';
import { DateRangeFilters } from '@/components/DateRangeFilters';
import { FadeInItem } from '@/components/FadeInItem';
import { InspectionSearchFilters } from '@/components/InspectionSearchFilters';
import { RecordsSearchBar } from '@/components/RecordsSearchBar';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  buildInspectionClientOptions,
  buildInspectionEmployeeOptions,
  filterInspectionsByClient,
  filterInspectionsByDateRange,
  filterInspectionsByEmployee,
  filterInspectionsBySearch,
  formatFilterDate,
  getDateRangeForPreset,
  scopeInspectionsForViewer,
  startOfMonth,
  type DateFilterPreset,
} from '@/utils/filterInspections';

function createSearchStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    header: {
      marginBottom: 8,
      gap: 4,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: colors.text.primary,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
    },
    rangeSummary: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.text.mutedOnDark,
      marginBottom: 4,
    },
    resultsTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.primary,
      marginTop: 8,
      marginBottom: 4,
      letterSpacing: -0.2,
    },
    resultsHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 12,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
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
  });
}

function describeRange(
  preset: DateFilterPreset,
  from: Date,
  to: Date,
): string {
  if (preset === 'day') {
    return `Showing inspections for ${formatFilterDate(from)}`;
  }
  if (preset === 'week') {
    return `${formatFilterDate(from)} – ${formatFilterDate(to)}`;
  }
  if (preset === 'month') {
    return `Showing inspections for ${from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  }
  return `${formatFilterDate(from)} – ${formatFilterDate(to)}`;
}

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createSearchStyles);
  const { isAdmin, user, isLoading: authLoading } = useAuth();
  const { inspections, isLoading: inspectionsLoading } = useCargoInspections();
  const scopedInspections = useMemo(
    () =>
      scopeInspectionsForViewer(inspections, {
        isAdmin,
        userId: user?.uid,
        email: user?.email,
      }),
    [inspections, isAdmin, user?.email, user?.uid],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('week');
  const [customFrom, setCustomFrom] = useState(() => startOfMonth());
  const [customTo, setCustomTo] = useState(() => new Date());
  const [clientId, setClientId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const clientOptions = useMemo(
    () => buildInspectionClientOptions(scopedInspections),
    [scopedInspections],
  );
  const employeeOptions = useMemo(
    () => buildInspectionEmployeeOptions(scopedInspections),
    [scopedInspections],
  );

  useEffect(() => {
    if (
      clientId &&
      !clientOptions.some((option) => option.value === clientId)
    ) {
      setClientId('');
    }
  }, [clientId, clientOptions]);

  useEffect(() => {
    if (
      employeeId &&
      !employeeOptions.some((option) => option.value === employeeId)
    ) {
      setEmployeeId('');
    }
  }, [employeeId, employeeOptions]);

  const filteredInspections = useMemo(() => {
    const byDate = filterInspectionsByDateRange(
      scopedInspections,
      dateRange.from,
      dateRange.to,
    );
    const byClient = filterInspectionsByClient(byDate, clientId);
    const byEmployee = filterInspectionsByEmployee(byClient, employeeId);
    return filterInspectionsBySearch(byEmployee, searchQuery);
  }, [scopedInspections, dateRange, clientId, employeeId, searchQuery]);

  const rangeLabel = useMemo(
    () => describeRange(datePreset, dateRange.from, dateRange.to),
    [datePreset, dateRange],
  );

  const isLoading = authLoading || inspectionsLoading;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={{ height: 16 }} />
      <FlatList
        data={filteredInspections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <FadeInItem index={index}>
            <CargoCard
              inspection={item}
              onPress={() =>
                router.push(`/cargo/${encodeURIComponent(item.id)}` as Href)
              }
            />
          </FadeInItem>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Advanced search</Text>
              <Text style={styles.subtitle}>
                {brand.panelTitle} · Filter by date, client, employee, ULD or AWB
              </Text>
            </View>

            <RecordsSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ULD, AWB, client, or employee..."
            />

            <DateRangeFilters
              preset={datePreset}
              onPresetChange={setDatePreset}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
            />

            <InspectionSearchFilters
              clientOptions={clientOptions}
              clientId={clientId}
              onClientIdChange={setClientId}
              employeeOptions={employeeOptions}
              employeeId={employeeId}
              onEmployeeIdChange={setEmployeeId}
              showEmployeeFilter={isAdmin}
            />

            <Text style={styles.rangeSummary}>{rangeLabel}</Text>
            <Text style={styles.resultsTitle}>
              {filteredInspections.length} inspection
              {filteredInspections.length === 1 ? '' : 's'}
            </Text>
            {filteredInspections.length > 0 ? (
              <Text style={styles.resultsHint}>Tap an inspection to view details</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyTitle}>No inspections found</Text>
            <Text style={styles.emptyHint}>
              Try another date range, client, employee, or search by ULD / AWB.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
