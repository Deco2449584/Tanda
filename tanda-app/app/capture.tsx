import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { db, storage } from '@/src/services/firebase';
import { setLatestCapturedPhotoUri, setLatestUploadData } from '@/src/state/capturePhoto';

type CameraPicture = {
  uri: string;
  width: number;
  height: number;
};

export default function CaptureScreen() {
  const router = useRouter();
  const { employeeDocId, employeeId, actionType, employeeName, employeeEmail } =
    useLocalSearchParams<{
      employeeDocId?: string;
      employeeId?: string;
      actionType?: string;
      employeeName?: string;
      employeeEmail?: string;
    }>();
  const resolvedAction = actionType === 'check_out' ? 'check_out' : 'check_in';
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const timerAnimation = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState('Center your face and tap capture.');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const now = new Date();
  const dateTimeLabel = now.toLocaleString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const ringScale = timerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const ringColor = timerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#ef4444', '#f59e0b', '#22c55e'],
  });

  const uriToBlob = useCallback((uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response as Blob);
      xhr.onerror = () => reject(new Error('No se pudo convertir imagen a blob'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }, []);

  const captureNow = useCallback(async (): Promise<CameraPicture | null> => {
    if (!cameraRef.current || isCapturing) return null;
    try {
      setIsCapturing(true);
      const photo = (await cameraRef.current.takePictureAsync({
        quality: 0.35,
        skipProcessing: true,
      })) as CameraPicture;
      setLatestCapturedPhotoUri(photo.uri);
      setStatus('Photo captured successfully.');
      return photo;
    } catch (error) {
      console.error(error);
      setStatus('Could not take photo. Please try again.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const finishAndSave = useCallback(
    async (photo: CameraPicture) => {
      if (!photo || !employeeDocId || !employeeId || isSaving) return;

      try {
        setIsSaving(true);
        setStatus('Uploading photo...');

        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const fileName = `${Date.now()}-${resolvedAction}.jpg`;
        const photoPath = `attendance/${employeeDocId}/${year}/${month}/${fileName}`;

        const imageBlob = await uriToBlob(photo.uri);
        const storageRef = ref(storage, photoPath);
        await uploadBytes(storageRef, imageBlob, { contentType: 'image/jpeg' });
        const photoUrl = await getDownloadURL(storageRef);
        (imageBlob as { close?: () => void }).close?.();

        setStatus('Saving record...');

        const attendanceRef = await addDoc(collection(db, 'attendance_records'), {
          employeeId,
          employeeNameSnapshot: employeeName ?? '',
          employeeEmailSnapshot: employeeEmail ?? '',
          type: resolvedAction,
          timestampServer: serverTimestamp(),
          source: 'expo-app',
          photoCaptured: true,
          photoPath,
          photoUrl,
        });

        await updateDoc(doc(db, 'employees', employeeDocId), {
          lastAction: resolvedAction,
          lastTimestampServer: serverTimestamp(),
        });

        setLatestUploadData({
          photoUrl,
          attendanceRecordId: attendanceRef.id,
          savedAt: now.toISOString(),
        });

        router.replace({
          pathname: '/success' as never,
          params: {
            employeeId,
            employeeName: employeeName ?? '',
            actionType: resolvedAction,
            photoUri: photo.uri,
          },
        });
      } catch (error) {
        console.error(error);
        setStatus('Could not save record. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [
      employeeDocId,
      employeeEmail,
      employeeId,
      employeeName,
      isSaving,
      resolvedAction,
      router,
      uriToBlob,
    ]
  );

  const startCountdownAndCapture = useCallback(() => {
    if (isCounting || isCapturing || isSaving) return;
    setIsCounting(true);
    setStatus('Preparing capture...');
    timerAnimation.setValue(0);

    Animated.timing(timerAnimation, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    timeoutRef.current = setTimeout(() => {
      setStatus('Capturing photo...');
      void captureNow().then((photo) => {
        if (photo) {
          void finishAndSave(photo);
        }
        setIsCounting(false);
        timerAnimation.setValue(0);
      });
    }, 3000);
  }, [captureNow, finishAndSave, isCapturing, isCounting, isSaving, timerAnimation]);

  useEffect(() => {
    if (!employeeDocId || !employeeId) {
      router.replace('/' as never);
    }
  }, [employeeDocId, employeeId, router]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#22c87a" />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera permission is required for face capture.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryButtonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Text style={[styles.header, { fontSize: isTablet ? 44 : 30 }]}>
        {resolvedAction === 'check_in' ? 'CLOCKING IN' : 'CLOCKING OUT'}
      </Text>
      <Text style={styles.subHeader}>Employee ID: {employeeId ?? '-'}</Text>

      <View style={[styles.card, { width: isTablet ? 540 : 340, height: isTablet ? 430 : 390 }]}>
        <Text style={styles.datetimePill}>{dateTimeLabel}</Text>
        <View style={[styles.faceFrame, { width: isTablet ? 290 : 250, height: isTablet ? 290 : 250, borderRadius: isTablet ? 145 : 125 }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.timerRing,
              {
                borderColor: ringColor,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <View style={[styles.faceRing, { width: isTablet ? 250 : 220, height: isTablet ? 250 : 220, borderRadius: isTablet ? 125 : 110 }]}>
            <CameraView ref={cameraRef} style={[styles.camera, { width: isTablet ? 238 : 210, height: isTablet ? 238 : 210, borderRadius: isTablet ? 119 : 105 }]} facing="front" />
          </View>
        </View>
        <Text style={styles.hintText}>Center your face. Capture runs automatically after the countdown.</Text>
      </View>

      <Text style={styles.statusText}>{status}</Text>

      <Pressable
        style={[
          styles.primaryButton,
          { width: isTablet ? 320 : 260, height: isTablet ? 62 : 54 },
          (isCounting || isCapturing || isSaving) && styles.primaryButtonDisabled,
        ]}
        onPress={startCountdownAndCapture}
        disabled={isCounting || isCapturing || isSaving}>
        <Text style={styles.primaryButtonText}>
          {isSaving ? 'Saving...' : isCounting ? 'Preparing capture...' : 'Take photo'}
        </Text>
      </Pressable>

      {isSaving ? (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.uploadTitle}>Uploading photo...</Text>
            <Text style={styles.uploadSubtitle}>Do not close the app during this process.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#051812',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(31, 199, 125, 0.15)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(18, 161, 95, 0.16)',
  },
  centered: {
    flex: 1,
    backgroundColor: '#08221c',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#e6fff4',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 14,
  },
  header: {
    color: '#f3fff9',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 12,
  },
  subHeader: {
    color: '#c5e3d8',
    marginTop: 6,
    marginBottom: 16,
    fontSize: 15,
  },
  card: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190,255,223,0.16)',
    overflow: 'visible',
    paddingTop: 14,
  },
  datetimePill: {
    color: '#e2fff1',
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  faceFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 8,
  },
  faceRing: {
    borderWidth: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#041712',
  },
  camera: {
  },
  hintText: {
    marginTop: 16,
    width: '84%',
    color: '#c3ddd2',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  statusText: {
    color: '#e9fff5',
    marginTop: 18,
    textAlign: 'center',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#14a460',
    borderRadius: 999,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: '#ecfff5',
    fontWeight: '700',
    fontSize: 16,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(1, 8, 6, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    width: 280,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 34, 28, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(143, 255, 201, 0.28)',
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    color: '#eafff2',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadSubtitle: {
    color: '#b6d8c9',
    fontSize: 13,
    textAlign: 'center',
  },
});
