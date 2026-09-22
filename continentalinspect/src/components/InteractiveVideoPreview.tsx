import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, View } from 'react-native';

import { useVideoThumbnail } from '@/hooks/useVideoThumbnail';

type InteractiveVideoPreviewProps = {
  uri: string;
  width: number;
  height: number;
};

export function InteractiveVideoPreview({ uri, width, height }: InteractiveVideoPreviewProps) {
  const { thumbnailUri } = useVideoThumbnail(uri);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  const toggle = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    player.play();
  };

  return (
    <View style={[styles.shell, { width, height }]}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
      />
      {!isPlaying && thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={[styles.poster, { width, height }]}
          contentFit="cover"
        />
      ) : null}
      <Pressable style={styles.play} onPress={toggle} hitSlop={8}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  play: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
