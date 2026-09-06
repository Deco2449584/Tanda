import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { RecordsSearchBar } from '@/components/RecordsSearchBar';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  filterInspectionsByDateRange,
  filterInspectionsBySearch,
  formatFilterDate,
  getDateRangeForPreset,
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
      fontSize: 24,
      color: colors.text.primary,
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
      fontSize: 17,
      color: colors.text.primary,
      marginTop: 4,
      marginBottom: 4,
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
  const { isLoading: authLoading } = useAuth();
  const { inspections, isLoading: inspectionsLoading } = useCargoInspections();

  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('week');
  const [customFrom, setCustomFrom] = useState(() => startOfMonth());
  const [customTo, setCustomTo] = useState(() => new Date());

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const filteredInspections = useMemo(() => {
    const byDate = filterInspectionsByDateRange(
      inspections,
      dateRange.from,
      dateRange.to,
    );
    return filterInspectionsBySearch(byDate, searchQuery);
  }, [inspections, dateRange, searchQuery]);

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
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Advanced search</Text>
              <Text style={styles.subtitle}>
                {brand.panelTitle} · Filter by date, ULD or AWB
              </Text>
            </View>

            <RecordsSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by ULD serial or AWB..."
            />

            <DateRangeFilters
              preset={datePreset}
              onPresetChange={setDatePreset}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
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
              Try another date range or search by ULD serial or AWB number.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
