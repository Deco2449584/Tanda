import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { getLatestCapturedPhotoUri, getLatestUploadData } from '@/src/state/capturePhoto';

export default function SuccessScreen() {
  const router = useRouter();
  const { employeeId, employeeName, actionType, photoUri } = useLocalSearchParams<{
    employeeId?: string;
    employeeName?: string;
    actionType?: string;
    photoUri?: string;
  }>();
  const [imageLoadError, setImageLoadError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const actionLabel = actionType === 'check_out' ? 'Clock Out' : 'Clock In';

  const now = new Date();
  const hour = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-AU');
  const uploadData = useMemo(() => getLatestUploadData(), []);
  const cleanPhotoUri = photoUri && photoUri !== 'undefined' ? photoUri : '';
  const photoSource = uploadData.photoUrl || cleanPhotoUri || getLatestCapturedPhotoUri();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/');
    }, 5000);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [router]);

  const progressSteps = [5, 4, 3, 2, 1];
  const completedSteps = 5 - secondsLeft;

  return (
    <View style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Text style={styles.brand}>TIMETRACKER PRO</Text>

      <View style={styles.checkCircle}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <View style={[styles.mainCard, { width: isTablet ? 620 : 350 }]}>
        <Text style={[styles.title, { fontSize: isTablet ? 50 : 42 }]}>RECORD SAVED</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailLeft}>
            <Text style={styles.row}>Employee: {employeeName || employeeId || '-'}</Text>
            <Text style={styles.row}>Action: {actionLabel}</Text>
            <Text style={styles.row}>Time: {hour}</Text>
            <Text style={styles.row}>Date: {date}</Text>
          </View>

          {photoSource ? (
            <Image
              source={{ uri: photoSource }}
              style={[styles.photoThumb, { width: isTablet ? 94 : 82, height: isTablet ? 94 : 82, borderRadius: isTablet ? 47 : 41 }]}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={[styles.photoThumbFallback, { width: isTablet ? 94 : 82, height: isTablet ? 94 : 82, borderRadius: isTablet ? 47 : 41 }]}>
              <Text style={styles.photoFallbackText}>✓</Text>
            </View>
          )}
        </View>

        {imageLoadError ? <Text style={styles.imageError}>Could not load photo.</Text> : null}

        <View style={styles.progressRow}>
          {progressSteps.map((step, idx) => (
            <View key={step} style={[styles.progressDot, idx < completedSteps && styles.progressDotActive]} />
          ))}
        </View>

        <Text style={styles.autoBackText}>Returning to home in {secondsLeft}s...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glowTop: {
    position: 'absolute',
    top: -90,
    left: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: BrandColors.blueGlow,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -110,
    right: -80,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: BrandColors.blueGlowSoft,
  },
  brand: {
    color: BrandColors.blue400,
    marginBottom: 10,
    letterSpacing: 1.8,
    fontSize: 13,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderWidth: 3,
    borderColor: BrandColors.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  checkIcon: {
    color: BrandColors.blue400,
    fontSize: 44,
    fontWeight: '700',
  },
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.blueBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: 'center',
  },
  title: {
    color: '#f3fff8',
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  detailCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: BrandColors.blueBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  detailLeft: {
    flex: 1,
    gap: 4,
  },
  row: {
    color: '#e6fff3',
    fontSize: 16,
    lineHeight: 22,
  },
  imageError: {
    marginTop: 8,
    color: '#fca5a5',
    fontSize: 12,
    textAlign: 'center',
  },
  photoThumb: {
    borderWidth: 2,
    borderColor: BrandColors.blue500,
    backgroundColor: '#0f172a',
  },
  photoThumbFallback: {
    borderWidth: 2,
    borderColor: BrandColors.blue500,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    color: BrandColors.blue400,
    fontSize: 30,
    fontWeight: '700',
  },
  progressRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  progressDotActive: {
    backgroundColor: BrandColors.blue500,
  },
  autoBackText: {
    marginTop: 8,
    color: BrandColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
