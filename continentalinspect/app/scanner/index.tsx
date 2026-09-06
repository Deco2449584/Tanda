import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormSectionCard } from '@/components/FormSectionCard';
import { CargoLabelOcrConfirmSheet } from '@/components/CargoLabelOcrConfirmSheet';
import { EvidencePhotosField } from '@/components/EvidencePhotosField';
import { EvidenceVideoField } from '@/components/EvidenceVideoField';
import { OptionGroup } from '@/components/OptionGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { useCargoInspections } from '@/context/CargoInspectionsContext';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { brand } from '@/theme/brand';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import {
  CONSERVATION_TYPES,
  EMPTY_CARGO_INSPECTION_INPUT,
  type NewCargoInspectionInput,
} from '@/types';
import {
  MANUAL_UNIT_TYPES,
  getUldKindLabel,
  getUldPrefix,
  getUnitTypeHint,
  getUnitTypeLabel,
  inferUnitTypeFromUldId,
  isManualUnitType,
  requiresUldId,
  resolveUnitType,
} from '@/utils/cargoUnitType';
import { normalizeUldId } from '@/utils/uldId';
import {
  extractCargoLabelFromImage,
  isCargoLabelOcrSupported,
} from '@/utils/extractCargoLabelFromImage';
import type { ParsedCargoLabel } from '@/utils/parseCargoLabelOcr';

type FormState = NewCargoInspectionInput;

function parseWeight(value: string): number {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseBoxCount(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function CargoInspectionFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createFormStyles);
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { isAdmin } = useAuth();
  const {
    inspections,
    isLoading: inspectionsLoading,
    addInspection,
    updateInspectionById,
    lookupInspectionByUldId,
    isOnline,
  } = useCargoInspections();

  const [permission, requestPermission] = useCameraPermissions();
  const scanHandledRef = useRef<string | null>(null);

  const [form, setForm] = useState<FormState>({ ...EMPTY_CARGO_INSPECTION_INPUT });
  const [weightText, setWeightText] = useState('0');
  const [boxCountText, setBoxCountText] = useState('0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrParsedResult, setOcrParsedResult] = useState<ParsedCargoLabel | null>(null);
  const [showOcrConfirm, setShowOcrConfirm] = useState(false);

  const isEditMode = Boolean(editingId);

  const patchForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_CARGO_INSPECTION_INPUT });
    setWeightText('0');
    setBoxCountText('0');
    setEditingId(null);
  }, []);

  useEffect(() => {
    if (!editId || inspectionsLoading) return;
    if (!isAdmin) {
      Alert.alert('Not allowed', 'Only administrators can edit inspections.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    const existing = inspections.find((item) => item.id === editId);
    if (!existing) return;

    setEditingId(existing.id);
    setForm({
      unitType: resolveUnitType(existing.unitType, existing.uldId),
      uldId: existing.uldId,
      awbNumber: existing.awbNumber,
      conservationType: existing.conservationType,
      foodType: existing.foodType,
      weightKg: existing.weightKg,
      boxCount: existing.boxCount,
      hasIssues: existing.hasIssues,
      issueDescription: existing.issueDescription ?? '',
      photoEvidence: [...existing.photoEvidence],
      videoEvidence: [...existing.videoEvidence],
    });
    setWeightText(String(existing.weightKg));
    setBoxCountText(String(existing.boxCount));
  }, [editId, isAdmin, inspections, inspectionsLoading, router]);

  const openScanner = useCallback(async () => {
    if (isEditMode) return;

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera permission',
          'Camera access is required to scan ULD barcodes and QR codes.',
        );
        return;
      }
    }

    scanHandledRef.current = null;
    setShowScanner(true);
  }, [isEditMode, permission, requestPermission]);

  const closeScanner = useCallback(() => {
    scanHandledRef.current = null;
    setShowScanner(false);
  }, []);

  const closeOcrConfirm = useCallback(() => {
    setShowOcrConfirm(false);
    setOcrParsedResult(null);
  }, []);

  const applyOcrFields = useCallback(
    (fields: { uldId: string; awbNumber: string }) => {
      setForm((prev) => {
        const inferred = fields.uldId ? inferUnitTypeFromUldId(fields.uldId) : null;
        const nextUnitType = inferred
          ? inferred
          : isManualUnitType(prev.unitType)
            ? prev.unitType
            : 'pallet_skid';
        return {
          ...prev,
          ...(fields.uldId ? { uldId: fields.uldId } : {}),
          ...(fields.awbNumber ? { awbNumber: fields.awbNumber } : {}),
          unitType: nextUnitType,
        };
      });
      closeOcrConfirm();
    },
    [closeOcrConfirm],
  );

  const captureLabelWithOcr = useCallback(async () => {
    if (isEditMode || isOcrProcessing) {
      return;
    }

    if (!isCargoLabelOcrSupported()) {
      Alert.alert(
        'Not available',
        'Label text recognition is not supported on this device. Use barcode scan or manual entry.',
      );
      return;
    }

    const currentPermission = await ImagePicker.getCameraPermissionsAsync();
    if (!currentPermission.granted) {
      const requested = await ImagePicker.requestCameraPermissionsAsync();
      if (!requested.granted) {
        Alert.alert(
          'Camera permission',
          'Camera access is required to photograph container labels.',
        );
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setIsOcrProcessing(true);
    try {
      const parsed = await extractCargoLabelFromImage(result.assets[0].uri);
      if (parsed.uldCandidates.length === 0 && parsed.awbCandidates.length === 0) {
        Alert.alert(
          'No codes found',
          'Could not detect a ULD or AWB on this label. Try again with better lighting or enter the codes manually.',
        );
        return;
      }

      setOcrParsedResult(parsed);
      setShowOcrConfirm(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OCR_NOT_SUPPORTED') {
        Alert.alert('Not available', 'Label text recognition is not supported on this device.');
      } else {
        Alert.alert('OCR failed', 'Could not read the label. Try again or enter the codes manually.');
      }
    } finally {
      setIsOcrProcessing(false);
    }
  }, [isEditMode, isOcrProcessing]);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (!showScanner || !data?.trim()) return;

      const normalized = normalizeUldId(data);
      if (!normalized || scanHandledRef.current === normalized) return;

      scanHandledRef.current = normalized;
      setForm((prev) => {
        const inferred = inferUnitTypeFromUldId(normalized);
        return {
          ...prev,
          uldId: normalized,
          unitType: inferred
            ? inferred
            : isManualUnitType(prev.unitType)
              ? prev.unitType
              : 'pallet_skid',
        };
      });
      setShowScanner(false);
    },
    [showScanner],
  );

  const buildPayload = (): NewCargoInspectionInput | null => {
    const uldId = form.uldId.trim();
    const awbNumber = form.awbNumber.trim();
    const foodType = form.foodType.trim();
    const unitType = resolveUnitType(form.unitType, uldId);

    if (requiresUldId(unitType) && !uldId) {
      Alert.alert('ULD required', 'Enter or scan the ULD ID (e.g. AKE 12345 CX).');
      return null;
    }
    if (!awbNumber) {
      Alert.alert('AWB required', 'Enter the air waybill number.');
      return null;
    }
    if (!foodType) {
      Alert.alert('Food type required', 'Enter the type of food or product.');
      return null;
    }
    if (form.hasIssues && !form.issueDescription?.trim()) {
      Alert.alert('Issue description', 'Describe the issue when damage or problems are reported.');
      return null;
    }

    return {
      unitType,
      uldId,
      awbNumber,
      conservationType: form.conservationType,
      foodType,
      weightKg: parseWeight(weightText),
      boxCount: parseBoxCount(boxCountText),
      hasIssues: form.hasIssues,
      issueDescription: form.hasIssues ? form.issueDescription?.trim() ?? '' : '',
      photoEvidence: form.photoEvidence,
      videoEvidence: form.videoEvidence,
    };
  };

  const saveInspection = async () => {
    const payload = buildPayload();
    if (!payload || isSaving) return;

    setIsSaving(true);
    try {
      if (isEditMode && editingId) {
        await updateInspectionById(editingId, payload);
        router.replace(`/cargo/${encodeURIComponent(editingId)}` as Href);
        return;
      }

      const duplicate = payload.uldId
        ? await lookupInspectionByUldId(payload.uldId)
        : null;
      if (duplicate) {
        Alert.alert(
          'ULD already registered',
          `${duplicate.uldId} is already on file (AWB ${duplicate.awbNumber}). Open the record or use another ULD.`,
        );
        setIsSaving(false);
        return;
      }

      await addInspection(payload);
      router.replace('/(tabs)' as Href);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'DUPLICATE_ULD') {
        Alert.alert('Duplicate ULD', 'This ULD is already registered.');
      } else if (message === 'OFFLINE_UPDATE_UNSUPPORTED') {
        Alert.alert(
          'Offline',
          'Editing is not available offline. Reconnect or wait for pending records to sync.',
        );
      } else {
        Alert.alert('Error', 'Could not save the inspection. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (inspectionsLoading && editId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (showScanner) {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>Camera permission required</Text>
            <Text style={styles.permissionText}>
              Allow camera access to scan ULD barcodes and QR codes on container labels.
            </Text>
            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant permission</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={closeScanner}>
              <Text style={styles.secondaryButtonText}>Cancel / Manual entry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.cameraRoot}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.cameraOverlay}>
          <ScreenHeader
            variant="overlay"
            title="Scan ULD label"
            subtitle={`${brand.name} · Barcode or QR`}
            onBack={closeScanner}
            backLabel="Cancel / Manual entry"
          />
          <Text style={styles.scanHint}>Align the barcode or QR code inside the frame</Text>
          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.manualEntryBtn, pressed && styles.manualEntryBtnPressed]}
            onPress={closeScanner}>
            <Text style={styles.manualEntryBtnText}>Cancel / Manual entry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formBottomPadding = Math.max(insets.bottom, 16) + 24;
  const inferredUldType = inferUnitTypeFromUldId(form.uldId);
  const uldPrefix = getUldPrefix(form.uldId);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScreenHeader
        title={isEditMode ? 'Edit inspection' : 'New inspection'}
        subtitle={brand.name}
        onBack={() => router.back()}
        backLabel="Back"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: formBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {!isEditMode ? (
            <View style={styles.formHero}>
              <View style={styles.formHeroTop}>
                <View style={styles.formHeroIcon}>
                  <Ionicons name="cube" size={22} color={colors.accent.primary} />
                </View>
                <View style={styles.formHeroText}>
                  <Text style={styles.formHeroEyebrow}>WAREHOUSE INTAKE</Text>
                  <Text style={styles.formHeroTitle}>Register cargo</Text>
                </View>
              </View>
              <Text style={styles.formHeroSubtitle}>
                Capture identification, commodity details, and evidence before the unit moves to
                dispatch.
              </Text>
              {!isOnline ? (
                <View style={styles.offlinePill}>
                  <Ionicons name="cloud-offline-outline" size={14} color="#B45309" />
                  <Text style={styles.offlinePillText}>Offline — saves on this device</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <FormSectionCard
            icon="barcode-outline"
            title="Identification"
            subtitle="ULD code and air waybill">
            <FormField
              label={requiresUldId(form.unitType) ? 'ULD ID' : 'ULD ID (optional)'}>
              <View style={styles.uldRow}>
                <TextInput
                  style={[styles.input, styles.uldInput]}
                  value={form.uldId}
                  onChangeText={(text) => {
                    setForm((prev) => {
                      const inferred = inferUnitTypeFromUldId(text);
                      if (inferred) {
                        return { ...prev, uldId: text, unitType: inferred };
                      }
                      return {
                        ...prev,
                        uldId: text,
                        unitType: isManualUnitType(prev.unitType)
                          ? prev.unitType
                          : 'pallet_skid',
                      };
                    });
                  }}
                  placeholder={
                    isManualUnitType(form.unitType) && !inferredUldType
                      ? 'Optional reference'
                      : 'AKE 12345 CX'
                  }
                  placeholderTextColor={colors.text.onSurfaceMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isEditMode}
                />
                {!isEditMode ? (
                  <View style={styles.scanActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.scanButton,
                        pressed && styles.scanButtonPressed,
                      ]}
                      onPress={openScanner}>
                      <Ionicons name="scan-outline" size={16} color={colors.text.onAccent} />
                      <Text style={styles.scanButtonText}>Barcode</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.ocrButton,
                        pressed && styles.ocrButtonPressed,
                        isOcrProcessing && styles.ocrButtonDisabled,
                      ]}
                      onPress={captureLabelWithOcr}
                      disabled={isOcrProcessing}>
                      {isOcrProcessing ? (
                        <ActivityIndicator size="small" color={colors.accent.primary} />
                      ) : (
                        <>
                          <Ionicons name="text-outline" size={16} color={colors.accent.primary} />
                          <Text style={styles.ocrButtonText}>Label OCR</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </FormField>

            {inferredUldType ? (
              <View style={styles.detectedTypeBlock}>
                <View style={styles.detectedTypeChip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent.primary} />
                  <Text style={styles.detectedTypeText}>
                    Detected: {getUldKindLabel(form.uldId) ?? getUnitTypeLabel(inferredUldType)}
                    {uldPrefix ? ` · ${uldPrefix}` : ''}
                  </Text>
                </View>
                <Text style={styles.unitTypeHint}>{getUnitTypeHint(inferredUldType)}</Text>
              </View>
            ) : (
              <View style={styles.detectedTypeBlock}>
                {normalizeUldId(form.uldId) ? (
                  <Text style={styles.unknownUldNote}>
                    ULD prefix not recognized — choose the cargo category below.
                  </Text>
                ) : (
                  <Text style={styles.unknownUldNote}>
                    No ULD code — select LCL, Pallet/Skid, Loose cargo, or Breakbulk.
                  </Text>
                )}
                <OptionGroup
                  label="Cargo category"
                  options={MANUAL_UNIT_TYPES}
                  value={
                    isManualUnitType(form.unitType) ? form.unitType : 'pallet_skid'
                  }
                  onChange={(unitType) => patchForm({ unitType })}
                  getLabel={getUnitTypeLabel}
                />
                <Text style={styles.unitTypeHint}>{getUnitTypeHint(form.unitType)}</Text>
              </View>
            )}

            <FormField label="Air waybill (AWB)">
              <TextInput
                style={styles.input}
                value={form.awbNumber}
                onChangeText={(text) => patchForm({ awbNumber: text })}
                placeholder="123-45678901"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </FormField>
          </FormSectionCard>

          <FormSectionCard
            icon="nutrition-outline"
            title="Cargo details"
            subtitle="Product, conservation, weight, and condition">
            <OptionGroup
              label="Conservation type"
              options={CONSERVATION_TYPES}
              value={form.conservationType}
              onChange={(value) => patchForm({ conservationType: value })}
            />

            <FormField label="Food type">
              <TextInput
                style={styles.input}
                value={form.foodType}
                onChangeText={(text) => patchForm({ foodType: text })}
                placeholder="e.g. FRESH SALMON"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCorrect={false}
              />
            </FormField>

            <View style={styles.rowTwo}>
              <View style={styles.halfField}>
                <FormField label="Weight (kg)">
                  <TextInput
                    style={styles.input}
                    value={weightText}
                    onChangeText={setWeightText}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.onSurfaceMuted}
                  />
                </FormField>
              </View>
              <View style={styles.halfField}>
                <FormField label="Box count">
                  <TextInput
                    style={styles.input}
                    value={boxCountText}
                    onChangeText={setBoxCountText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text.onSurfaceMuted}
                  />
                </FormField>
              </View>
            </View>

            <View style={styles.switchCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Damage / issues detected?</Text>
                  <Text style={styles.switchHint}>
                    Turn on for damage, temperature breach, or documentation problems
                  </Text>
                </View>
                <Switch
                  value={form.hasIssues}
                  onValueChange={(hasIssues) => patchForm({ hasIssues })}
                  trackColor={{
                    false: colors.border.onSurface,
                    true: colors.accent.primary,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {form.hasIssues ? (
              <FormField label="Issue description">
                <TextInput
                  style={styles.textArea}
                  value={form.issueDescription ?? ''}
                  onChangeText={(text) => patchForm({ issueDescription: text })}
                  placeholder="Describe the issue found during inspection..."
                  placeholderTextColor={colors.text.onSurfaceMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </FormField>
            ) : null}
          </FormSectionCard>

          <FormSectionCard
            icon="images-outline"
            title="Evidence"
            subtitle="Photos and video clips from the inspection">
            <EvidencePhotosField
              photos={form.photoEvidence}
              onChange={(photoEvidence) => patchForm({ photoEvidence })}
              isAdmin={isAdmin}
            />

            <EvidenceVideoField
              videos={form.videoEvidence}
              onChange={(videoEvidence) => patchForm({ videoEvidence })}
            />
          </FormSectionCard>

          <View style={styles.footerCard}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSaving) && styles.primaryButtonPressed,
                isSaving && styles.primaryButtonDisabled,
              ]}
              onPress={() => void saveInspection()}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.text.onAccent} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.onAccent} />
                  <Text style={styles.primaryButtonText}>
                    {isEditMode ? 'Update inspection' : 'Save inspection'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CargoLabelOcrConfirmSheet
        visible={showOcrConfirm}
        parsed={ocrParsedResult}
        onCancel={closeOcrConfirm}
        onApply={applyOcrFields}
      />
    </SafeAreaView>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createFormStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER = 28;
const CORNER_WIDTH = 4;

function createFormStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background.primary },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    cameraRoot: {
      flex: 1,
      backgroundColor: '#000',
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scanHint: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 24,
    },
    frameContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
    },
    frame: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: CORNER,
      height: CORNER,
      borderColor: colors.accent.primary,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderLeftWidth: CORNER_WIDTH,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: CORNER_WIDTH,
      borderRightWidth: CORNER_WIDTH,
    },
    manualEntryBtn: {
      marginHorizontal: 24,
      marginBottom: 32,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    manualEntryBtnPressed: { opacity: 0.85 },
    manualEntryBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    permissionBox: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 16,
    },
    permissionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 20,
      color: colors.text.primary,
      textAlign: 'center',
    },
    permissionText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    formContent: { padding: 20, paddingTop: 4, gap: 14 },
    formHero: {
      backgroundColor: colors.surface.card,
      borderRadius: 18,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
    },
    formHeroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    formHeroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(2, 101, 220, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    formHeroText: {
      flex: 1,
      gap: 2,
    },
    formHeroEyebrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      color: colors.accent.primary,
    },
    formHeroTitle: {
      fontFamily: fonts.heading,
      fontSize: 22,
      color: colors.text.onSurface,
    },
    formHeroSubtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.onSurfaceMuted,
      lineHeight: 20,
    },
    offlinePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
    },
    offlinePillText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: '#B45309',
    },
    unitTypeHint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      lineHeight: 18,
      marginTop: -4,
    },
    detectedTypeBlock: {
      gap: 8,
    },
    detectedTypeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accent.primary,
      backgroundColor: 'rgba(2, 101, 220, 0.08)',
    },
    detectedTypeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.accent.primary,
    },
    unknownUldNote: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      lineHeight: 18,
    },
    field: { gap: 8 },
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    uldRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    uldInput: {
      flex: 1,
    },
    scanActions: {
      gap: 8,
      justifyContent: 'center',
    },
    input: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
    },
    scanButton: {
      minWidth: 76,
      borderRadius: 12,
      backgroundColor: colors.accent.primary,
      paddingHorizontal: 10,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    scanButtonPressed: {
      backgroundColor: colors.accent.primaryPressed,
    },
    scanButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.text.onAccent,
      textAlign: 'center',
    },
    ocrButton: {
      minWidth: 76,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent.primary,
      backgroundColor: colors.surface.card,
      paddingHorizontal: 10,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      minHeight: 52,
    },
    ocrButtonPressed: {
      backgroundColor: 'rgba(2, 101, 220, 0.08)',
    },
    ocrButtonDisabled: {
      opacity: 0.7,
    },
    ocrButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.accent.primary,
      textAlign: 'center',
    },
    switchCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    textArea: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
      minHeight: 100,
    },
    rowTwo: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    switchText: { flex: 1, gap: 4 },
    switchLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.onSurface,
    },
    switchHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.text.onSurfaceMuted,
      lineHeight: 17,
    },
    footerCard: {
      gap: 10,
      paddingTop: 4,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent.primary,
      borderRadius: 14,
      paddingVertical: 16,
      shadowColor: '#0265DC',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 4,
    },
    primaryButtonPressed: { backgroundColor: colors.accent.primaryPressed },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.onAccent,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.surface.card,
    },
    secondaryButtonPressed: { opacity: 0.7 },
    secondaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.secondary,
    },
  });
}
