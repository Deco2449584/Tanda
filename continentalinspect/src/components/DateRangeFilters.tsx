import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM_MEDIUM, ACCENT_DIM_SOFT } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
    formatFilterDate,
    type DateFilterPreset,
} from '@/utils/filterInspections';

type DateRangeFiltersProps = {
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  customFrom: Date;
  customTo: Date;
  onCustomFromChange: (date: Date) => void;
  onCustomToChange: (date: Date) => void;
};

type PickerTarget = 'from' | 'to' | null;

const PRESETS: { id: DateFilterPreset; label: string; icon: string }[] = [
  { id: 'day',    label: 'Today',      icon: 'today-outline' },
  { id: 'week',   label: 'This week',  icon: 'calendar-outline' },
  { id: 'month',  label: 'This month', icon: 'calendar-number-outline' },
  { id: 'custom', label: 'Custom',     icon: 'options-outline' },
];

const DAYS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Styles (all surface/border/text colors come from the theme) ──────────────

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: 12,
      marginBottom: 16,
    },
    sectionLabel: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: colors.text.primary,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    // ── Preset chips ────────────────────────────────────────────────────────
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.card,
    },
    chipActive: {
      borderColor: ACCENT,
      backgroundColor: ACCENT_DIM_MEDIUM,
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.text.secondary,
    },
    chipTextActive: {
      color: ACCENT,
      fontFamily: fonts.bodySemiBold,
    },

    // ── Date buttons (From / To) ─────────────────────────────────────────────
    customRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dateField: {
      flex: 1,
      gap: 6,
    },
    dateLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.card,
    },
    dateBtnActive: {
      borderColor: ACCENT,
      backgroundColor: ACCENT_DIM_MEDIUM,
    },
    dateBtnText: {
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    dateBtnTextActive: {
      color: ACCENT,
    },

    // ── Calendar card ────────────────────────────────────────────────────────
    calendarCard: {
      backgroundColor: colors.surface.elevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.onSurface,
    },
    calNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.muted,
    },
    calMonthYear: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.primary,
      letterSpacing: 0.2,
    },
    calDayRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    calDayName: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: ACCENT,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    calGrid: {
      paddingHorizontal: 12,
      paddingBottom: 14,
      gap: 2,
    },
    calWeekRow: {
      flexDirection: 'row',
    },
    calDay: {
      flex: 1,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    calDayInRange: {
      backgroundColor: ACCENT_DIM_SOFT,
      borderRadius: 0,
    },
    calDayRangeStart: {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    calDayRangeEnd: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    calDaySelected: {
      backgroundColor: ACCENT,
      borderRadius: 8,
    },
    calDayToday: {
      borderWidth: 1,
      borderColor: ACCENT,
      borderRadius: 8,
    },
    calDayText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.onSurface,
    },
    calDayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    calDayTextMuted: {
      color: colors.text.onSurfaceMuted,
    },
    calDayTextToday: {
      color: ACCENT,
      fontWeight: '700',
    },
    calDayEmpty: {
      flex: 1,
      height: 40,
    },
    pickingLabel: {
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: ACCENT,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingTop: 10,
      paddingBottom: 2,
    },
  });
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

type MiniCalendarProps = {
  target: 'from' | 'to';
  from: Date;
  to: Date;
  onSelect: (date: Date) => void;
};

function MiniCalendar({ target, from, to, onSelect }: MiniCalendarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const initial = target === 'from' ? from : to;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const today   = startOfDayLocal(new Date());
  const fromDay = startOfDayLocal(from);
  const toDay   = startOfDayLocal(to);
  const weeks   = buildCalendarGrid(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  return (
    <View style={styles.calendarCard}>
      <Text style={styles.pickingLabel}>
        {target === 'from' ? '▸ Select start date' : '▸ Select end date'}
      </Text>

      <View style={styles.calHeader}>
        <Pressable style={styles.calNavBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.calMonthYear}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable style={styles.calNavBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.calDayRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={styles.calDayName}>{d}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calWeekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.calDayEmpty} />;

              const dayTs      = day.getTime();
              const isFrom     = isSameDay(day, fromDay);
              const isTo       = isSameDay(day, toDay);
              const isSelected = isFrom || isTo;
              const inRange    = dayTs > fromDay.getTime() && dayTs < toDay.getTime();
              const isToday    = isSameDay(day, today);
              const isFuture   = dayTs > today.getTime();
              const singleDay  = isSameDay(fromDay, toDay);

              const cellStyle = [
                styles.calDay,
                inRange && styles.calDayInRange,
                inRange && di === 0 && styles.calDayRangeStart,
                inRange && di === 6 && styles.calDayRangeEnd,
                isFrom && !singleDay && styles.calDayRangeStart,
                isTo   && !singleDay && styles.calDayRangeEnd,
                isSelected && styles.calDaySelected,
                !isSelected && isToday && styles.calDayToday,
              ];

              const textStyle = [
                styles.calDayText,
                isFuture    && styles.calDayTextMuted,
                !isSelected && isToday && styles.calDayTextToday,
                isSelected  && styles.calDayTextSelected,
              ];

              return (
                <Pressable
                  key={di}
                  style={cellStyle}
                  disabled={isFuture}
                  onPress={() => onSelect(day)}>
                  <Text style={textStyle}>{day.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── DateRangeFilters ─────────────────────────────────────────────────────────

export function DateRangeFilters({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: DateRangeFiltersProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  function applyDate(date: Date) {
    if (pickerTarget === 'from') {
      onCustomFromChange(date);
      if (date > customTo) onCustomToChange(date);
      setPickerTarget('to');
    } else if (pickerTarget === 'to') {
      onCustomToChange(date);
      if (date < customFrom) onCustomFromChange(date);
      setPickerTarget(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Date range</Text>
      <Text style={styles.hint}>Filter records by when they were registered</Text>

      {/* Preset chips */}
      <View style={styles.chipRow}>
        {PRESETS.map((item) => {
          const active = preset === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                onPresetChange(item.id);
                setPickerTarget(null);
              }}>
              <Ionicons
                name={item.icon as any}
                size={14}
                color={active ? ACCENT : colors.text.secondary}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom date buttons */}
      {preset === 'custom' ? (
        <View style={styles.customRow}>
          {(['from', 'to'] as const).map((target) => {
            const isActive = pickerTarget === target;
            const date = target === 'from' ? customFrom : customTo;
            return (
              <View key={target} style={styles.dateField}>
                <Text style={styles.dateLabel}>{target === 'from' ? 'From' : 'To'}</Text>
                <Pressable
                  style={[styles.dateBtn, isActive && styles.dateBtnActive]}
                  onPress={() => setPickerTarget(isActive ? null : target)}>
                  <Ionicons
                    name="calendar"
                    size={17}
                    color={isActive ? ACCENT : colors.text.onSurfaceMuted}
                  />
                  <Text style={[styles.dateBtnText, isActive && styles.dateBtnTextActive]}>
                    {formatFilterDate(date)}
                  </Text>
                  <Ionicons
                    name={isActive ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={isActive ? ACCENT : colors.text.onSurfaceMuted}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Calendar — all platforms */}
      {pickerTarget && preset === 'custom' ? (
        <MiniCalendar
          target={pickerTarget}
          from={customFrom}
          to={customTo}
          onSelect={applyDate}
        />
      ) : null}
    </View>
  );
}
