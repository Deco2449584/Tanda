import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InfoModal } from '@/components/InfoModal';
import { useVideoThumbnail } from '@/hooks/useVideoThumbnail';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import { downloadVideoEvidenceToGallery } from '@/utils/downloadVideoEvidence';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_WIDTH = SCREEN_WIDTH - 72;
const PREVIEW_HEIGHT = 200;
const CLIP_CARD_WIDTH = 108;
const CLIP_CARD_HEIGHT = 76;

type CargoVideoEvidenceSectionProps = {
  videoUrls: readonly string[];
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    section: {
      gap: 12,
    },
    indexLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
    },
    previewShell: {
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#0a0a0a',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      alignSelf: 'center',
    },
    previewImage: {
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
    },
    previewPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    previewHint: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    previewHintText: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: '#FFFFFF',
    },
    previewPlaceholderText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
    },
    carousel: {
      gap: 10,
      paddingVertical: 2,
    },
    clipCard: {
      width: CLIP_CARD_WIDTH,
      height: CLIP_CARD_HEIGHT,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.border.onSurface,
      backgroundColor: '#0a0a0a',
    },
    clipCardSelected: {
      borderColor: colors.accent.primary,
    },
    clipCardPressed: {
      opacity: 0.85,
    },
    clipImage: {
      width: '100%',
      height: '100%',
    },
    clipPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clipBadge: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    clipBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: '#FFFFFF',
    },
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.muted,
    },
    downloadBtnPressed: {
      opacity: 0.85,
    },
    downloadBtnDisabled: {
      opacity: 0.55,
    },
    downloadBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
  });
}

type VideoClipThumbnailProps = {
  videoUrl: string;
  clipNumber: number;
  selected: boolean;
  onPress: () => void;
  showBadge?: boolean;
};

function VideoClipThumbnail({
  videoUrl,
  clipNumber,
  selected,
  onPress,
  showBadge = true,
}: VideoClipThumbnailProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { thumbnailUri, isLoadingThumbnail } = useVideoThumbnail(videoUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Video clip ${clipNumber} thumbnail`}
      style={({ pressed }) => [
        styles.clipCard,
        selected && styles.clipCardSelected,
        pressed && styles.clipCardPressed,
      ]}
      onPress={onPress}>
      {isLoadingThumbnail ? (
        <View style={styles.clipPlaceholder}>
          <ActivityIndicator size="small" color={colors.text.onSurfaceMuted} />
        </View>
      ) : thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.clipImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={thumbnailUri}
        />
      ) : (
        <View style={styles.clipPlaceholder}>
          <Ionicons name="videocam" size={24} color={colors.text.onSurfaceMuted} />
        </View>
      )}
      {showBadge ? (
        <View style={styles.clipBadge}>
          <Text style={styles.clipBadgeText}>Clip {clipNumber}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type VideoPreviewProps = {
  videoUrl: string;
};

function VideoPreview({ videoUrl }: VideoPreviewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { thumbnailUri, isLoadingThumbnail } = useVideoThumbnail(videoUrl);

  return (
    <View style={styles.previewShell}>
      {isLoadingThumbnail ? (
        <View style={styles.previewPlaceholder}>
          <ActivityIndicator size="large" color={colors.text.onSurfaceMuted} />
        </View>
      ) : thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.previewImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={thumbnailUri}
        />
      ) : (
        <View style={styles.previewPlaceholder}>
          <Ionicons name="videocam-outline" size={40} color={colors.text.onSurfaceMuted} />
          <Text style={styles.previewPlaceholderText}>Preview unavailable</Text>
        </View>
      )}
      <View style={styles.previewHint}>
        <Ionicons name="download-outline" size={14} color="#FFFFFF" />
        <Text style={styles.previewHintText}>Download to view in your gallery</Text>
      </View>
    </View>
  );
}

export function CargoVideoEvidenceSection({ videoUrls }: CargoVideoEvidenceSectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const videoUrlsKey = videoUrls.join('\n');

  useEffect(() => {
    setSelectedVideoIndex(0);
  }, [videoUrlsKey]);

  useEffect(() => {
    setSelectedVideoIndex((current) =>
      Math.min(current, Math.max(0, videoUrls.length - 1)),
    );
  }, [videoUrls.length]);

  const safeIndex = Math.min(selectedVideoIndex, Math.max(0, videoUrls.length - 1));
  const selectedVideoUrl = videoUrls[safeIndex];
  const total = videoUrls.length;
  const showCarousel = total > 1;

  const handleDownload = async () => {
    if (isDownloading || !selectedVideoUrl) return;

    setIsDownloading(true);
    try {
      const result = await downloadVideoEvidenceToGallery(selectedVideoUrl, safeIndex);

      if (result.ok) {
        setShowSuccessModal(true);
        return;
      }

      Alert.alert('Download Failed', result.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!selectedVideoUrl) {
    return null;
  }

  return (
    <View style={styles.section}>
      <InfoModal
        visible={showSuccessModal}
        icon="checkmark-circle-outline"
        title="Success"
        message="Video saved to your gallery."
        onConfirm={() => setShowSuccessModal(false)}
      />

      <VideoPreview key={selectedVideoUrl} videoUrl={selectedVideoUrl} />

      <Text style={styles.indexLabel}>
        Clip {safeIndex + 1} / {total}
      </Text>

      {showCarousel ? (
        <FlatList
          data={videoUrls}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item, index }) => (
            <View style={index < total - 1 ? { marginRight: 10 } : undefined}>
              <VideoClipThumbnail
                videoUrl={item}
                clipNumber={index + 1}
                selected={index === safeIndex}
                onPress={() => setSelectedVideoIndex(index)}
              />
            </View>
          )}
        />
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.downloadBtn,
          pressed && !isDownloading && styles.downloadBtnPressed,
          isDownloading && styles.downloadBtnDisabled,
        ]}
        onPress={() => void handleDownload()}
        disabled={isDownloading}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.text.onSurface} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.text.onSurface} />
        )}
        <Text style={styles.downloadBtnText}>
          {isDownloading ? 'Downloading…' : 'Download Video Evidence'}
        </Text>
      </Pressable>
    </View>
  );
}
