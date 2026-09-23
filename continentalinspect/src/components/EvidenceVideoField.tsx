import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InteractiveVideoPreview } from '@/components/InteractiveVideoPreview';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  deleteLocalEvidenceFileIfOwned,
  persistEvidenceCaptureUri,
} from '@/services/inspectionPendingMedia';
import type { AppColors } from '@/theme/palettes';
import {
  VIDEO_BAND_COLORS,
  VIDEO_BAND_LABELS,
  classifyVideoWeight,
  formatDurationMinutes,
  formatFileSizeBytes,
  formatMaxVideoSizeMb,
  resolveAssetFileSizeBytes,
  videoDurationSeconds,
} from '@/utils/evidenceMediaValidation';

const LIBRARY_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['videos'],
  allowsEditing: false,
  allowsMultipleSelection: true,
  selectionLimit: 0,
};

type EvidenceVideoFieldProps = {
  videos: string[];
  onChange: (videos: string[]) => void;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Photo library permission',
      'We need media library access to select video evidence.',
    );
    return false;
  }
  return true;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text.onSurface },
    hint: { fontSize: 12, color: colors.text.onSurfaceMuted, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 10 },
    actionButton: {
      flex: 1,
      backgroundColor: colors.accent.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    actionButtonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    actionButtonPressed: { opacity: 0.75 },
    actionButtonDisabled: { opacity: 0.55 },
    actionButtonText: { fontSize: 14, fontWeight: '600', color: colors.text.onAccent },
    actionButtonTextSecondary: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.onSurface,
    },
    list: { gap: 8, paddingVertical: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surface.muted,
    },
    rowLabel: { flex: 1, fontSize: 13, color: colors.text.onSurface },
    removeBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 2,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 14,
    },
    empty: { fontSize: 13, color: colors.text.onSurfaceMuted, fontStyle: 'italic' },
    countHint: { fontSize: 12, color: colors.text.onSurfaceMuted },
    previewCard: {
      position: 'relative',
      gap: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.surface.muted,
    },
    metrics: { gap: 4 },
    metricsText: { fontSize: 12, color: colors.text.onSurface },
    bandTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    bandFill: { height: 6, borderRadius: 3 },
    sourceHint: { fontSize: 11, color: colors.text.onSurfaceMuted },
  });
}

type VideoMeta = {
  durationSec: number | null;
  sizeBytes: number | null;
  source: 'record' | 'gallery';
};

export function EvidenceVideoField({ videos, onChange }: EvidenceVideoFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const videosRef = useRef(videos);
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [metaByUri, setMetaByUri] = useState<Record<string, VideoMeta>>({});

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  const appendVideo = (uri: string) => {
    const next = [...videosRef.current, uri];
    videosRef.current = next;
    onChange(next);
  };

  const rememberMeta = async (
    uri: string,
    asset: ImagePicker.ImagePickerAsset,
    source: VideoMeta['source'],
  ) => {
    const durationSec = videoDurationSeconds(asset.duration);
    const sizeBytes = await resolveAssetFileSizeBytes(uri, asset.fileSize);
    setMetaByUri((current) => ({
      ...current,
      [uri]: { durationSec, sizeBytes, source },
    }));
  };

  const ingestLibraryVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) {
      return;
    }

    try {
      const durableUri = await persistEvidenceCaptureUri(asset.uri, 'video');
      await rememberMeta(durableUri, asset, 'gallery');
      appendVideo(durableUri);
    } catch {
      Alert.alert(
        'Could not keep this video',
        'The clip could not be saved on this phone. Pick it again before you leave this screen.',
      );
    }
  };

  const handlePickFromLibrary = async () => {
    if (isSavingCapture) return;

    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync(LIBRARY_PICKER_OPTIONS);
    if (result.canceled || result.assets.length === 0) return;

    setIsSavingCapture(true);
    try {
      for (const asset of result.assets) {
        await ingestLibraryVideo(asset);
      }
    } finally {
      setIsSavingCapture(false);
    }
  };

  const handleRemove = (uri: string) => {
    onChange(videos.filter((item) => item !== uri));
    void deleteLocalEvidenceFileIfOwned(uri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Video evidence</Text>
      <Text style={styles.hint}>
        Choose videos from the gallery. Prefer HD (720p), about 2–5 minutes. Files stay on this
        phone until the upload finishes (optimized to ≤{formatMaxVideoSizeMb()} MB).
      </Text>
      <Text style={styles.countHint}>
        {isSavingCapture ? 'Saving videos on this phone…' : `${videos.length} video(s) attached`}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
            isSavingCapture && styles.actionButtonDisabled,
          ]}
          onPress={() => void handlePickFromLibrary()}
          disabled={isSavingCapture}>
          {isSavingCapture ? (
            <ActivityIndicator color={colors.text.onAccent} />
          ) : (
            <Text style={styles.actionButtonText}>Choose videos</Text>
          )}
        </Pressable>
      </View>

      {videos.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {videos.map((uri, index) => {
            const meta = metaByUri[uri];
            const band = classifyVideoWeight(meta?.durationSec ?? null, meta?.sizeBytes ?? null);
            const bandColor = VIDEO_BAND_COLORS[band];
            const sizeLabel =
              meta?.sizeBytes != null ? formatFileSizeBytes(meta.sizeBytes) : 'Size pending';
            return (
              <View key={`${uri}-${index}`} style={styles.previewCard}>
                <InteractiveVideoPreview uri={uri} width={280} height={158} />
                <View style={styles.metrics}>
                  <Text style={styles.metricsText}>
                    {formatDurationMinutes(meta?.durationSec ?? null)} · {sizeLabel} ·{' '}
                    {VIDEO_BAND_LABELS[band]}
                  </Text>
                  <View style={styles.bandTrack}>
                    <View style={[styles.bandFill, { width: '100%', backgroundColor: bandColor }]} />
                  </View>
                  <Text style={styles.sourceHint}>
                    Saved on this phone. It stays here if the app closes or the connection drops.
                  </Text>
                </View>
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)} hitSlop={8}>
                  <Ionicons name="close-circle" size={26} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No videos yet</Text>
      )}
    </View>
  );
}
