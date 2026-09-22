import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type RecordTipsModalProps = {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(8, 16, 28, 0.62)',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    card: {
      backgroundColor: colors.surface.card,
      borderRadius: 20,
      padding: 22,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    title: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 20,
      color: colors.text.onSurface,
    },
    lead: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.onSurfaceMuted,
    },
    tip: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    tipText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.onSurface,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    cancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    continue: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.accent.primary,
    },
    cancelText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.text.onSurface,
    },
    continueText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.text.onAccent,
    },
  });
}

const TIPS = [
  {
    icon: 'videocam-outline' as const,
    text: 'Record in HD (720p or 1080p), not 4K / Ultra HD, to keep the file light.',
  },
  {
    icon: 'sunny-outline' as const,
    text: 'Use good lighting, a steady frame, and a clear focus on the cargo.',
  },
  {
    icon: 'time-outline' as const,
    text: 'Aim for 2 to 5 minutes. Over 10 minutes or a very large file is over the limit.',
  },
];

export function RecordTipsModal({ visible, onCancel, onContinue }: RecordTipsModalProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Before you record</Text>
          <Text style={styles.lead}>
            Live recordings are saved on this device. Gallery picks stay as references until you
            upload.
          </Text>
          {TIPS.map((tip) => (
            <View key={tip.text} style={styles.tip}>
              <Ionicons name={tip.icon} size={18} color="#0265DC" />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.continue} onPress={onContinue}>
              <Text style={styles.continueText}>Open camera</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
