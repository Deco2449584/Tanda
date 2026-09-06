import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import {
  formatMaxPhotoSizeMb,
} from '@/utils/evidenceMediaValidation';

const IMAGE_PICKER_OPTIONS: Pick<
  ImagePicker.ImagePickerOptions,
  'mediaTypes' | 'allowsEditing'
> = {
  mediaTypes: ['images'],
  allowsEditing: false,
};

type EvidencePhotosFieldProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
  isAdmin?: boolean;
  lockedPhotoUris?: readonly string[];
};

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (!requested.granted) {
    Alert.alert('Camera permission', 'We need camera access to capture photo evidence.');
    return false;
  }
  return true;
}

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Photo library permission',
      'We need photo library access to select photo evidence.',
    );
    return false;
  }
  return true;
}

const THUMB_SIZE = 88;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text.onSurface },
    hint: { fontSize: 12, color: colors.text.onSurfaceMuted },
    actions: { flexDirection: 'row', gap: 10 },
    actionButton: {
      flex: 1,
      backgroundColor: colors.accent.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    actionButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    actionButtonPressed: { opacity: 0.75 },
    actionButtonText: { fontSize: 14, fontWeight: '600', color: colors.text.onAccent },
    actionButtonTextSecondary: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    thumbnails: { gap: 10, paddingVertical: 4 },
    thumbnailWrap: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.surface.muted,
    },
    thumbnail: { width: THUMB_SIZE, height: THUMB_SIZE },
    removeBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 18,
    },
    empty: { fontSize: 13, color: colors.text.onSurfaceMuted, fontStyle: 'italic' },
    countHint: { fontSize: 12, color: colors.text.onSurfaceMuted },
  });
}

export function EvidencePhotosField({
  photos,
  onChange,
  isAdmin = false,
  lockedPhotoUris = [],
}: EvidencePhotosFieldProps) {
  const styles = useThemedStyles(createStyles);
  const lockedSet = useMemo(() => new Set(lockedPhotoUris), [lockedPhotoUris]);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const canRemovePhoto = (uri: string) => isAdmin || !lockedSet.has(uri);

  const appendPhotos = (uris: string[]) => {
    if (uris.length === 0) return;
    const next = [...photosRef.current, ...uris];
    photosRef.current = next;
    onChange(next);
  };

  const handleTakePhoto = async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]?.uri) {
      appendPhotos([result.assets[0].uri]);
    }
  };

  const handlePickFromGallery = async () => {
    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      appendPhotos(result.assets.map((asset) => asset.uri).filter(Boolean));
    }
  };

  const handleRemove = (uri: string) => {
    if (!canRemovePhoto(uri)) {
      Alert.alert(
        'Not allowed',
        'Only administrators can remove photos already saved on this record.',
      );
      return;
    }
    onChange(photos.filter((item) => item !== uri));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photo evidence</Text>
      <Text style={styles.hint}>
        Photos are optimized and uploaded after you tap Save (≤{formatMaxPhotoSizeMb()} MB each)
      </Text>
      <Text style={styles.countHint}>{photos.length} photo(s) attached</Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={() => void handleTakePhoto()}>
          <Text style={styles.actionButtonText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => void handlePickFromGallery()}>
          <Text style={styles.actionButtonTextSecondary}>Gallery</Text>
        </Pressable>
      </View>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnails}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbnailWrap}>
              <Image
                source={{ uri }}
                style={styles.thumbnail}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={uri}
              />
              {canRemovePhoto(uri) ? (
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)}>
                  <Text style={styles.removeBtnText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No photos yet</Text>
      )}
    </View>
  );
}
