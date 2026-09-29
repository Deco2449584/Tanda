import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM_MEDIUM } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { InspectionFilterOption } from '@/utils/filterInspections';

type InspectionSearchFiltersProps = {
  clientOptions: InspectionFilterOption[];
  clientId: string;
  onClientIdChange: (clientId: string) => void;
  employeeOptions: InspectionFilterOption[];
  employeeId: string;
  onEmployeeIdChange: (employeeId: string) => void;
  /** Hide employee filter for non-admins who only see their own records. */
  showEmployeeFilter?: boolean;
};

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
    row: {
      gap: 10,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    selectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.card,
    },
    selectBtnActive: {
      borderColor: ACCENT,
      backgroundColor: ACCENT_DIM_MEDIUM,
    },
    selectText: {
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    selectTextMuted: {
      color: colors.text.secondary,
      fontFamily: fonts.body,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '70%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: colors.surface.elevated,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.onSurface,
    },
    sheetTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.primary,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.onSurface,
    },
    optionRowSelected: {
      backgroundColor: ACCENT_DIM_MEDIUM,
    },
    optionText: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.text.primary,
    },
    optionTextSelected: {
      color: ACCENT,
      fontFamily: fonts.bodySemiBold,
    },
  });
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: InspectionFilterOption[];
  onChange: (value: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    return options.find((option) => option.value === value)?.label ?? placeholder;
  }, [options, placeholder, value]);

  const sheetOptions = useMemo(
    () => [{ value: '', label: placeholder }, ...options],
    [options, placeholder],
  );

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={[styles.selectBtn, open && styles.selectBtnActive]}
        onPress={() => setOpen(true)}
      >
        <Ionicons
          name={label === 'Client' ? 'business-outline' : 'person-outline'}
          size={17}
          color={value ? ACCENT : colors.text.onSurfaceMuted}
        />
        <Text
          style={[styles.selectText, !value && styles.selectTextMuted]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={open ? ACCENT : colors.text.onSurfaceMuted}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>
            <FlatList
              data={sheetOptions}
              keyExtractor={(item) => item.value || '__all__'}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={ACCENT} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function InspectionSearchFilters({
  clientOptions,
  clientId,
  onClientIdChange,
  employeeOptions,
  employeeId,
  onEmployeeIdChange,
  showEmployeeFilter = true,
}: InspectionSearchFiltersProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Client & employee</Text>
      <Text style={styles.hint}>
        Narrow results by assigned client
        {showEmployeeFilter ? ' or who registered the cargo' : ''}
      </Text>

      <View style={styles.row}>
        <FilterSelect
          label="Client"
          value={clientId}
          placeholder="All clients"
          options={clientOptions}
          onChange={onClientIdChange}
        />
        {showEmployeeFilter ? (
          <FilterSelect
            label="Employee"
            value={employeeId}
            placeholder="All employees"
            options={employeeOptions}
            onChange={onEmployeeIdChange}
          />
        ) : null}
      </View>
    </View>
  );
}
