import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  deleteLocalEvidenceFileIfOwned,
  persistEvidenceCaptureUri,
} from '@/services/inspectionPendingMedia';
import type { AppColors } from '@/theme/palettes';
import {
  VIDEO_BAND_COLORS,
  VIDEO_BAND_LABELS,
  classifyPhotoWeight,
  formatFileSizeBytes,
  resolveAssetFileSizeBytes,
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
    thumbnailWrap: { width: THUMB_SIZE, gap: 4 },
    imageBox: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.surface.muted,
    },
    thumbnail: { width: THUMB_SIZE, height: THUMB_SIZE },
    photoMeta: { fontSize: 10, fontWeight: '600' },
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
    preview: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      backgroundColor: colors.surface.muted,
    },
    viewer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.88)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    viewerImage: { width: '100%', height: '70%' },
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [sizeByUri, setSizeByUri] = useState<Record<string, number | null>>({});
  const knownSizes = useRef(new Set<string>());
  const lockedSet = useMemo(() => new Set(lockedPhotoUris), [lockedPhotoUris]);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const uri of photos) {
        if (knownSizes.current.has(uri)) continue;
        knownSizes.current.add(uri);
        const size = await resolveAssetFileSizeBytes(uri);
        if (!cancelled) {
          setSizeByUri((current) => ({ ...current, [uri]: size }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const canRemovePhoto = (uri: string) => isAdmin || !lockedSet.has(uri);

  const appendPhotos = (uris: string[]) => {
    if (uris.length === 0) return;
    const next = [...photosRef.current, ...uris];
    photosRef.current = next;
    onChange(next);
  };

  const handlePickFromGallery = async () => {
    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsCopying(true);
      const uris: string[] = [];
      try {
        for (const asset of result.assets) {
          if (!asset.uri) continue;
          try {
            const durableUri = await persistEvidenceCaptureUri(asset.uri, 'photo');
            uris.push(durableUri);
            const size = await resolveAssetFileSizeBytes(durableUri, asset.fileSize);
            knownSizes.current.add(durableUri);
            setSizeByUri((current) => ({ ...current, [durableUri]: size }));
          } catch {
            Alert.alert(
              'Could not keep a photo',
              'One photo could not be saved on this phone. Pick it again before you leave this screen.',
            );
          }
        }
        appendPhotos(uris);
      } finally {
        setIsCopying(false);
      }
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
    void deleteLocalEvidenceFileIfOwned(uri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photo evidence</Text>
      <Text style={styles.hint}>
        Choose photos from the gallery. They are copied onto this phone first, then uploaded when you sync.
      </Text>
      <Text style={styles.countHint}>
        {isCopying ? 'Saving photos on this phone…' : `${photos.length} photo(s) attached`}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={() => void handlePickFromGallery()}
          disabled={isCopying}>
          <Text style={styles.actionButtonText}>{isCopying ? 'Saving…' : 'Choose photos'}</Text>
        </Pressable>
      </View>

      {photos[0] ? (
        <Pressable onPress={() => setPreviewUri(photos[0])}>
          <Image source={{ uri: photos[0] }} style={styles.preview} contentFit="cover" />
        </Pressable>
      ) : null}

      <Modal visible={previewUri != null} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={styles.viewer} onPress={() => setPreviewUri(null)}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.viewerImage} contentFit="contain" />
          ) : null}
        </Pressable>
      </Modal>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnails}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbnailWrap}>
              <View style={styles.imageBox}>
                <Pressable onPress={() => setPreviewUri(uri)}>
                  <Image
                    source={{ uri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={uri}
                  />
                </Pressable>
                {canRemovePhoto(uri) ? (
                  <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)} hitSlop={6}>
                    <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
              <Text
                style={[
                  styles.photoMeta,
                  { color: VIDEO_BAND_COLORS[classifyPhotoWeight(sizeByUri[uri] ?? null)] },
                ]}
                numberOfLines={2}>
                {sizeByUri[uri] != null ? formatFileSizeBytes(sizeByUri[uri] as number) : 'Size pending'}
                {' · '}
                {VIDEO_BAND_LABELS[classifyPhotoWeight(sizeByUri[uri] ?? null)]}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No photos yet</Text>
      )}
    </View>
  );
}
