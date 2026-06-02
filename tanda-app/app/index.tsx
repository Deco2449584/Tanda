import { collection, getDocs, limit, query, where, type Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandColors } from '@/constants/brand';
import { resolveKioskAction } from '@/src/lib/resolve-kiosk-action';
import { db } from '@/src/services/firebase';

const logoSource = require('@/assets/images/logo.svg');

export default function TandaScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const keypadWidth = isTablet ? 470 : 320;
  const keyWidth = isTablet ? 145 : 98;
  const keyHeight = isTablet ? 82 : 62;
  const titleSize = isTablet ? 56 : 40;

  const handleNumberPress = (digit: string) => {
    if (employeeId.length >= 8) return;
    setEmployeeId((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setEmployeeId((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setEmployeeId('');
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      setErrorModal({
        visible: true,
        title: 'ID required',
        message: 'Please enter your employee ID.',
      });
      return;
    }

    try {
      setIsLoading(true);
      const cleanId = employeeId.trim();
      const employeesQuery = query(
        collection(db, 'employees'),
        where('employeeId', '==', cleanId),
        limit(1)
      );
      const employeesSnap = await getDocs(employeesQuery);

      if (employeesSnap.empty) {
        setErrorModal({
          visible: true,
          title: 'Invalid code',
          message: 'Invalid or unknown employee code.',
        });
        return;
      }

      const employeeDoc = employeesSnap.docs[0];
      const employeeData = employeeDoc.data() as {
        employeeId?: string;
        name?: string;
        email?: string;
        active?: boolean;
        lastAction?: string;
        lastTimestampServer?: Timestamp;
      };
      if (employeeData.active === false) {
        setErrorModal({
          visible: true,
          title: 'Inactive user',
          message: 'This employee is inactive. Contact your administrator.',
        });
        return;
      }

      const actionType = resolveKioskAction(
        employeeData.lastAction,
        employeeData.lastTimestampServer,
      );

      router.push({
        pathname: '/capture' as never,
        params: {
          employeeDocId: employeeDoc.id,
          employeeId: employeeData.employeeId ?? cleanId,
          actionType,
          employeeName: employeeData.name ?? '',
          employeeEmail: employeeData.email ?? '',
        },
      });
    } catch (error) {
      console.error(error);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Could not validate employee. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Image source={logoSource} style={styles.logo} accessibilityLabel="Continental Cargo" />

      <View style={[styles.panel, { width: isTablet ? 640 : 350 }]}>
        <Text style={[styles.title, { fontSize: titleSize }]}>WELCOME</Text>
        <Text style={styles.subtitle}>Enter your ID to record attendance</Text>

        <View style={[styles.pinBox, { width: isTablet ? 460 : 290, height: isTablet ? 66 : 52 }]}>
          <Text style={[styles.pinText, { fontSize: isTablet ? 34 : 26 }]}>
            {employeeId || '--------'}
          </Text>
        </View>
        <Text style={styles.pinLabel}>EMPLOYEE ID</Text>

        <View style={[styles.keypad, { width: keypadWidth }]}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
            <Pressable key={key} style={[styles.key, { width: keyWidth, height: keyHeight }]} onPress={() => handleNumberPress(key)}>
              <Text style={[styles.keyText, { fontSize: isTablet ? 44 : 30 }]}>{key}</Text>
            </Pressable>
          ))}

          <Pressable style={[styles.key, { width: keyWidth, height: keyHeight }]} onPress={handleClear}>
            <Text style={[styles.keyText, { fontSize: isTablet ? 24 : 20 }]}>C</Text>
          </Pressable>
          <Pressable style={[styles.key, { width: keyWidth, height: keyHeight }]} onPress={() => handleNumberPress('0')}>
            <Text style={[styles.keyText, { fontSize: isTablet ? 44 : 30 }]}>0</Text>
          </Pressable>
          <Pressable style={[styles.key, { width: keyWidth, height: keyHeight }]} onPress={handleBackspace}>
            <Text style={[styles.keyText, { fontSize: isTablet ? 30 : 24 }]}>⌫</Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            { width: keypadWidth, height: isTablet ? 74 : 58 },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={() => void handleSubmit()}>
          {isLoading ? (
            <ActivityIndicator color={BrandColors.white} />
          ) : (
            <Text style={styles.submitText}>CONTINUE</Text>
          )}
        </Pressable>
      </View>

      <Modal visible={errorModal.visible} transparent animationType="fade" onRequestClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <Pressable style={styles.modalButton} onPress={() => setErrorModal((prev) => ({ ...prev, visible: false }))}>
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.pinScreenBg,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: BrandColors.blueGlow,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: BrandColors.blueGlowSoft,
  },
  logo: {
    width: 280,
    height: 100,
    resizeMode: 'contain',
    tintColor: BrandColors.white,
    marginBottom: 20,
  },
  panel: {
    marginTop: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.blueBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: '#f3fff8',
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    color: BrandColors.textSoft,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 15,
  },
  pinBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pinText: {
    color: '#e5fff2',
    letterSpacing: 4,
    fontWeight: '700',
  },
  pinLabel: {
    color: BrandColors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  keypad: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: '#f3fff9',
    fontWeight: '600',
  },
  submitButton: {
    alignSelf: 'center',
    marginTop: 18,
    borderRadius: 26,
    backgroundColor: BrandColors.blue600,
    borderWidth: 1,
    borderColor: BrandColors.blueBorderSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#e7fff2',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 8, 6, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.blueBorder,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  modalTitle: {
    color: '#f0fff8',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    color: BrandColors.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  modalButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: BrandColors.blue600,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: '#edfff4',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
