import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

type OfflineBannerProps = {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt?: string | null;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
    },
    offline: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    pending: {
      backgroundColor: 'rgba(2, 101, 220, 0.08)',
      borderColor: 'rgba(2, 101, 220, 0.25)',
    },
    text: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurface,
      lineHeight: 18,
    },
  });
}

export function OfflineBanner({ isOnline, pendingCount, lastSyncedAt }: OfflineBannerProps) {
  const styles = useThemedStyles(createStyles);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  const isOffline = !isOnline;
  const title = isOffline
    ? 'No connection — showing saved data on this device.'
    : `Syncing ${pendingCount} pending inspection${pendingCount === 1 ? '' : 's'}…`;

  const detail = isOffline
    ? pendingCount > 0
      ? `${pendingCount} inspection${pendingCount === 1 ? '' : 's'} will upload when you are back online.`
      : lastSyncedAt
        ? `Last sync ${lastSyncedAt}.`
        : 'New inspections will be saved on this device until connection returns.'
    : 'Keep the app open until uploads finish.';

  return (
    <View style={[styles.banner, isOffline ? styles.offline : styles.pending]}>
      <Ionicons
        name={isOffline ? 'cloud-offline-outline' : 'cloud-upload-outline'}
        size={18}
        color={isOffline ? '#B45309' : '#0265DC'}
      />
      <Text style={styles.text}>
        {title}
        {'\n'}
        {detail}
      </Text>
    </View>
  );
}
