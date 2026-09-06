import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ACCENT, ACCENT_DIM, ACCENT_DIM_SOFT } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type InfoModalProps = {
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    topAccent: {
      height: 4,
      backgroundColor: ACCENT,
    },
    body: {
      padding: 24,
      gap: 16,
      alignItems: 'center',
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: ACCENT_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.onSurface,
      textAlign: 'center',
    },
    message: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
      lineHeight: 21,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.onSurface,
    },
    confirmBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnPressed: {
      backgroundColor: ACCENT_DIM_SOFT,
    },
    confirmText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: ACCENT,
    },
  });
}

export function InfoModal({
  visible,
  icon = 'information-circle-outline',
  title,
  message,
  confirmLabel = 'Got it',
  onConfirm,
}: InfoModalProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onConfirm}>
      <Pressable style={styles.backdrop} onPress={onConfirm}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.topAccent} />
          <View style={styles.body}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={28} color={ACCENT} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && styles.confirmBtnPressed,
            ]}
            onPress={onConfirm}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
