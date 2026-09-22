import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useVideoThumbnail } from '@/hooks/useVideoThumbnail';

type InteractiveVideoPreviewProps = {
  uri: string;
  width: number;
  height: number;
};

export function InteractiveVideoPreview({ uri, width, height }: InteractiveVideoPreviewProps) {
  const { thumbnailUri } = useVideoThumbnail(uri);
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    const subscription = player.addListener('playingChange', ({ isPlaying }) => {
      setPlaying(isPlaying);
    });
    return () => {
      subscription.remove();
    };
  }, [player]);

  const toggle = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    player.play();
  };

  return (
    <View style={[styles.shell, { width, height }]}>
      {playing ? (
        <VideoView
          player={player}
          style={{ width, height }}
          contentFit="cover"
          nativeControls={false}
        />
      ) : thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={{ width, height }} contentFit="cover" />
      ) : (
        <View style={[styles.fallback, { width, height }]}>
          <Ionicons name="videocam" size={28} color="#FFFFFF" />
        </View>
      )}
      <Pressable style={styles.play} onPress={toggle} hitSlop={8}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
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
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
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
