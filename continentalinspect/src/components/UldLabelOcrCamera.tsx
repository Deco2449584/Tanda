import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { brand } from '@/theme/brand';
import { fonts } from '@/theme/typography';
import { cropPhotoToViewFrame, type ViewRect } from '@/utils/cropPhotoToViewFrame';

const CORNER = 26;
const CORNER_WIDTH = 3;

type UldLabelOcrCameraProps = {
  onCancel: () => void;
  onCaptured: (croppedUri: string) => void;
};

export function UldLabelOcrCamera({ onCancel, onCaptured }: UldLabelOcrCameraProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [frameRect, setFrameRect] = useState<ViewRect | null>(null);

  // Wide frame for stamped IDs like "AKE 41382 EK"
  const frameWidth = Math.min(windowWidth * 0.92, 420);
  const frameHeight = Math.max(88, Math.round(frameWidth * 0.28));

  const onCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewSize({ width, height });
  }, []);

  const onFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrameRect({ x, y, width, height });
  }, []);

  const takeFramedPhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || capturing || !frameRect) {
      return;
    }
    if (viewSize.width <= 0 || viewSize.height <= 0) {
      return;
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
        exif: false,
      });

      if (!photo?.uri || !photo.width || !photo.height) {
        throw new Error('PHOTO_FAILED');
      }

      const croppedUri = await cropPhotoToViewFrame({
        photoUri: photo.uri,
        photoWidth: photo.width,
        photoHeight: photo.height,
        viewWidth: viewSize.width,
        viewHeight: viewSize.height,
        frame: frameRect,
      });

      onCaptured(croppedUri);
    } catch {
      setCapturing(false);
      Alert.alert('Capture failed', 'Could not capture the framed ID. Try again.');
    }
  }, [cameraReady, capturing, frameRect, onCaptured, viewSize]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000', padding: 24 }]}>
        <Text style={styles.permissionTitle}>Camera permission required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to photograph the ULD ID on the container.
        </Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  const maskColor = 'rgba(0,0,0,0.55)';
  const frameLeft = viewSize.width > 0 ? (viewSize.width - frameWidth) / 2 : 0;
  const frameTop = viewSize.height > 0 ? viewSize.height * 0.34 : 180;

  return (
    <View style={styles.root} onLayout={onCameraLayout}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <ScreenHeader
          variant="overlay"
          title="Frame ULD number"
          subtitle={`${brand.name} · Label OCR`}
          onBack={onCancel}
          backLabel="Cancel"
        />

        <Text style={styles.hint}>
          Fit the big ID (e.g. AKE 41382 EK) inside the frame — exclude logos and other containers
        </Text>

        {/* Dimmed mask with a clear hole for the frame */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.maskBand, { top: 0, height: frameTop, backgroundColor: maskColor }]} />
          <View
            style={[
              styles.maskBand,
              {
                top: frameTop,
                left: 0,
                width: Math.max(0, frameLeft),
                height: frameHeight,
                backgroundColor: maskColor,
              },
            ]}
          />
          <View
            style={[
              styles.maskBand,
              {
                top: frameTop,
                right: 0,
                width: Math.max(0, viewSize.width - frameLeft - frameWidth),
                height: frameHeight,
                backgroundColor: maskColor,
              },
            ]}
          />
          <View
            style={[
              styles.maskBand,
              {
                top: frameTop + frameHeight,
                bottom: 0,
                backgroundColor: maskColor,
              },
            ]}
          />
        </View>

        <View
          onLayout={onFrameLayout}
          style={[
            styles.frame,
            {
              top: frameTop,
              left: frameLeft,
              width: frameWidth,
              height: frameHeight,
              borderColor: colors.accent.primary,
            },
          ]}
          pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.accent.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.accent.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.accent.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.accent.primary }]} />
          <Text style={styles.frameGuide}>AKE ····· ··</Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            onPress={onCancel}
            disabled={capturing}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.shutterOuter,
              { borderColor: colors.accent.primary },
              pressed && styles.pressed,
              (!cameraReady || capturing) && styles.shutterDisabled,
            ]}
            onPress={takeFramedPhoto}
            disabled={!cameraReady || capturing}>
            {capturing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={[styles.shutterInner, { backgroundColor: colors.accent.primary }]} />
            )}
          </Pressable>

          <View style={styles.footerSpacer} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    paddingHorizontal: 28,
    marginTop: 8,
    lineHeight: 20,
    zIndex: 2,
  },
  maskBand: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  frame: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  frameGuide: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 22,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.35)',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 10,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    zIndex: 4,
  },
  cancelBtn: {
    minWidth: 72,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  footerSpacer: {
    minWidth: 72,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  permissionTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#FFF',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
});
