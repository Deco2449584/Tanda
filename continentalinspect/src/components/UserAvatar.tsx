import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

type UserAvatarProps = {
  size?: number;
};

export function UserAvatar({ size = 40 }: UserAvatarProps) {
  const { profile, user } = useAuth();
  const photoUrl = profile?.photoUrl?.trim();
  const initial = (profile?.name || user?.email || '?').trim().slice(0, 1).toUpperCase();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#0265DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
