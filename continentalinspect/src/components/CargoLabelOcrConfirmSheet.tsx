import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  pickDefaultCargoLabelFields,
  type ParsedCargoLabel,
} from '@/utils/parseCargoLabelOcr';

type CargoLabelOcrConfirmSheetProps = {
  visible: boolean;
  parsed: ParsedCargoLabel | null;
  onCancel: () => void;
  onApply: (fields: { uldId: string; awbNumber: string }) => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '82%',
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.onSurface,
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      lineHeight: 20,
      marginBottom: 16,
    },
    sectionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.onSurface,
      marginBottom: 8,
      marginTop: 4,
    },
    option: {
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      backgroundColor: colors.background.secondary,
    },
    optionSelected: {
      borderColor: colors.accent.primary,
      backgroundColor: 'rgba(2, 101, 220, 0.08)',
    },
    optionText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      marginBottom: 8,
    },
    rawBox: {
      maxHeight: 120,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
      padding: 12,
      marginBottom: 16,
    },
    rawLine: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    primaryBtn: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.accent.primary,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.onAccent,
    },
  });
}

export function CargoLabelOcrConfirmSheet({
  visible,
  parsed,
  onCancel,
  onApply,
}: CargoLabelOcrConfirmSheetProps) {
  const styles = useThemedStyles(createStyles);
  const defaults = useMemo(
    () => (parsed ? pickDefaultCargoLabelFields(parsed) : { uldId: '', awbNumber: '' }),
    [parsed],
  );
  const [selectedUld, setSelectedUld] = useState(defaults.uldId);
  const [selectedAwb, setSelectedAwb] = useState(defaults.awbNumber);

  useEffect(() => {
    if (!visible || !parsed) {
      return;
    }
    const next = pickDefaultCargoLabelFields(parsed);
    setSelectedUld(next.uldId);
    setSelectedAwb(next.awbNumber);
  }, [visible, parsed]);

  if (!parsed) {
    return null;
  }

  const canApply = Boolean(selectedUld.trim() || selectedAwb.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Review label text</Text>
          <Text style={styles.subtitle}>
            Confirm the ULD and AWB detected from the label before applying them to the form.
          </Text>

          <Text style={styles.sectionLabel}>ULD ID</Text>
          {parsed.uldCandidates.length > 0 ? (
            parsed.uldCandidates.map((candidate) => {
              const isSelected = selectedUld === candidate;
              return (
                <Pressable
                  key={candidate}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => setSelectedUld(candidate)}>
                  <Text style={styles.optionText}>{candidate}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No ULD code detected. Enter it manually.</Text>
          )}

          <Text style={styles.sectionLabel}>AWB</Text>
          {parsed.awbCandidates.length > 0 ? (
            parsed.awbCandidates.map((candidate) => {
              const isSelected = selectedAwb === candidate;
              return (
                <Pressable
                  key={candidate}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => setSelectedAwb(candidate)}>
                  <Text style={styles.optionText}>{candidate}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No AWB detected. Enter it manually.</Text>
          )}

          {parsed.rawLines.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Detected text</Text>
              <ScrollView style={styles.rawBox} nestedScrollEnabled>
                {parsed.rawLines.map((line, index) => (
                  <Text key={`${line}-${index}`} style={styles.rawLine}>
                    {line}
                  </Text>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onCancel}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, !canApply && styles.primaryBtnDisabled]}
              disabled={!canApply}
              onPress={() =>
                onApply({
                  uldId: selectedUld.trim(),
                  awbNumber: selectedAwb.trim(),
                })
              }>
              <Text style={styles.primaryBtnText}>Apply to form</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
