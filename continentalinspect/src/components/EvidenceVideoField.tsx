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

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  deleteLocalEvidenceFileIfOwned,
  persistEvidenceCaptureUri,
} from '@/services/inspectionPendingMedia';
import type { AppColors } from '@/theme/palettes';
import {
  assessCapturedVideo,
  formatMaxVideoSizeMb,
  resolveAssetFileSizeBytes,
  videoDurationSeconds,
} from '@/utils/evidenceMediaValidation';

const CAMERA_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['videos'],
  videoMaxDuration: 0,
  allowsEditing: false,
};

const LIBRARY_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['videos'],
  allowsEditing: false,
};

type EvidenceVideoFieldProps = {
  videos: string[];
  onChange: (videos: string[]) => void;
};

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (!requested.granted) {
    Alert.alert('Camera permission', 'We need camera access to record video evidence.');
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
    removeBtn: { padding: 4 },
    empty: { fontSize: 13, color: colors.text.onSurfaceMuted, fontStyle: 'italic' },
    countHint: { fontSize: 12, color: colors.text.onSurfaceMuted },
  });
}

export function EvidenceVideoField({ videos, onChange }: EvidenceVideoFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const videosRef = useRef(videos);
  const [isSavingCapture, setIsSavingCapture] = useState(false);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  const appendVideo = (uri: string) => {
    const next = [...videosRef.current, uri];
    videosRef.current = next;
    onChange(next);
  };

  const ingestVideoAsset = async (asset: ImagePickerAsset) => {
    if (!asset.uri) {
      return;
    }

    setIsSavingCapture(true);
    try {
      const durableUri = await persistEvidenceCaptureUri(asset.uri, 'video');
      const durationSec = videoDurationSeconds(asset.duration);
      const sizeBytes = await resolveAssetFileSizeBytes(durableUri, asset.fileSize);
      const assessment = assessCapturedVideo({ durationSec, sizeBytes });

      appendVideo(durableUri);
      Alert.alert(assessment.title, assessment.message);
    } catch {
      Alert.alert(
        'Could not save video',
        'The recording could not be copied to device storage. Try again — do not leave this screen until the video is listed below.',
      );
    } finally {
      setIsSavingCapture(false);
    }
  };

  const openCameraRecorder = async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync(CAMERA_PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      await ingestVideoAsset(result.assets[0]);
    }
  };

  const handleRecordVideo = () => {
    if (isSavingCapture) return;

    Alert.alert(
      'Record in HD',
      'Before recording:\n\n• Set the camera resolution to HD / 720p (not 4K)\n• Keep clips around 10 minutes or less\n• Stay on this screen until the video appears in the list — it is saved on the device before upload\n\nAfter Save, videos are optimized (≤' +
        formatMaxVideoSizeMb() +
        ' MB).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open camera', onPress: () => void openCameraRecorder() },
      ],
    );
  };

  const handlePickFromLibrary = async () => {
    if (isSavingCapture) return;

    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync(LIBRARY_PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) {
      await ingestVideoAsset(result.assets[0]);
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
        Prefer HD (720p), up to ~10 min. Videos are saved on this device first, then uploaded when
        online (optimized to ≤{formatMaxVideoSizeMb()} MB).
      </Text>
      <Text style={styles.countHint}>{videos.length} video(s) attached</Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
            isSavingCapture && styles.actionButtonDisabled,
          ]}
          onPress={handleRecordVideo}
          disabled={isSavingCapture}>
          {isSavingCapture ? (
            <ActivityIndicator color={colors.text.onAccent} />
          ) : (
            <Text style={styles.actionButtonText}>Record video</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            pressed && styles.actionButtonPressed,
            isSavingCapture && styles.actionButtonDisabled,
          ]}
          onPress={() => void handlePickFromLibrary()}
          disabled={isSavingCapture}>
          <Text style={styles.actionButtonTextSecondary}>Upload video</Text>
        </Pressable>
      </View>

      {videos.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {videos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.row}>
              <Ionicons name="videocam" size={20} color={colors.text.onSurface} />
              <Text style={styles.rowLabel} numberOfLines={1}>
                Video {index + 1} · saved on device
              </Text>
              <Pressable style={styles.removeBtn} onPress={() => handleRemove(uri)}>
                <Ionicons name="close-circle" size={22} color="#c62828" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No videos yet</Text>
      )}
    </View>
  );
}
