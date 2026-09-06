import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  deactivateEmployee,
  getRoleLabel,
  resolveRoleFromEmployee,
  subscribeToAllEmployees,
  updateEmployeeProfile,
  type ManagedEmployee,
} from '@/services/userRepository';
import { ACCENT, ACCENT_DIM, ACCENT_PRESSED } from '@/theme/accent';
import type { AppColors } from '@/theme/palettes';
import { fonts } from '@/theme/typography';
import type { UserRole } from '@/types/auth';

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    sectionTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 16,
      color: colors.text.primary,
      marginTop: 4,
    },

    // ── User list cards ──────────────────────────────────────────────────────
    userCard: {
      backgroundColor: colors.surface.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    userAccent: {
      width: 3,
      backgroundColor: ACCENT,
    },
    userBody: {
      flex: 1,
      paddingHorizontal: 13,
      paddingVertical: 11,
      gap: 4,
    },
    userEmail: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text.onSurface,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    roleBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
    },
    userActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
      gap: 2,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Empty / loading ──────────────────────────────────────────────────────
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.text.secondary,
    },

    // ── Add user button ──────────────────────────────────────────────────────
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: ACCENT,
      borderStyle: 'dashed',
      backgroundColor: ACCENT_DIM,
    },
    addBtnPressed: { opacity: 0.8 },
    addBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
    },

    // ── Shared modal shell ───────────────────────────────────────────────────
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      overflow: 'hidden',
    },
    modalAccent: {
      height: 4,
      backgroundColor: ACCENT,
    },
    modalHeader: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 4,
      gap: 4,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    modalIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: ACCENT_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 18,
      color: colors.text.onSurface,
    },
    modalSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      paddingLeft: 46,
      marginBottom: 6,
    },
    modalBody: {
      paddingHorizontal: 24,
      paddingBottom: 20,
      gap: 14,
    },
    modalDivider: {
      height: 1,
      backgroundColor: colors.border.onSurface,
    },
    modalFooter: {
      flexDirection: 'row',
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border.onSurface,
    },
    modalCancelText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text.secondary,
    },
    modalConfirmBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmBtnPressed: {
      backgroundColor: ACCENT_DIM,
    },
    modalConfirmText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
    },
    // Destructive confirm (red background)
    modalDestructiveBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ACCENT,
    },
    modalDestructiveBtnPressed: {
      backgroundColor: ACCENT_PRESSED,
    },
    modalDestructiveText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },

    // ── Form fields ──────────────────────────────────────────────────────────
    fieldGroup: { gap: 6 },
    fieldLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.text.onSurfaceMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text.onSurface,
    },
    inputFocused: { borderColor: ACCENT },

    modalScroll: {
      maxHeight: 420,
    },
    modalScrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 20,
      gap: 16,
    },
    readOnlyField: {
      backgroundColor: colors.surface.muted,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    readOnlyText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.text.onSurfaceMuted,
    },
    // ── Department chips ───────────────────────────────────────────────────────
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    roleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.onSurface,
      backgroundColor: colors.background.secondary,
    },
    roleChipActive: {
      borderColor: ACCENT,
      backgroundColor: ACCENT_DIM,
    },
    roleChipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.text.secondary,
    },
    roleChipTextActive: { color: ACCENT },

    // ── Info / error modal body ───────────────────────────────────────────────
    infoBody: {
      padding: 24,
      gap: 14,
      alignItems: 'center',
    },
    infoIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: ACCENT_DIM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTitle: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 17,
      color: colors.text.onSurface,
      textAlign: 'center',
    },
    infoMessage: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.text.onSurfaceMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    infoBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoBtnPressed: { backgroundColor: ACCENT_DIM },
    infoBtnText: {
      fontFamily: fonts.headingSemiBold,
      fontSize: 15,
      color: ACCENT,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: UserRole) {
  return role === 'admin'
    ? { bg: ACCENT_DIM, text: ACCENT }
    : { bg: 'rgba(156,163,175,0.15)', text: '#6B7280' };
}

// ─── Generic info/error modal ─────────────────────────────────────────────────

type InfoModalState = { title: string; message: string } | null;

function AppInfoModal({
  state,
  onClose,
  styles,
}: {
  state: InfoModalState;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal
      visible={!!state}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.infoBody}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="alert-circle-outline" size={26} color={ACCENT} />
            </View>
            <Text style={styles.infoTitle}>{state?.title ?? ''}</Text>
            <Text style={styles.infoMessage}>{state?.message ?? ''}</Text>
          </View>
          <View style={styles.modalDivider} />
          <Pressable
            style={({ pressed }) => [styles.infoBtn, pressed && styles.infoBtnPressed]}
            onPress={onClose}>
            <Text style={styles.infoBtnText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

type DeleteModalState = { user: ManagedEmployee } | null;

function DeleteConfirmModal({
  state,
  onClose,
  onConfirm,
  isDeleting,
  styles,
}: {
  state: DeleteModalState;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal
      visible={!!state}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.infoBody}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="trash-outline" size={24} color={ACCENT} />
            </View>
            <Text style={styles.infoTitle}>Delete user</Text>
            <Text style={styles.infoMessage}>
              Remove <Text style={{ fontWeight: '700' }}>{state?.user.email}</Text>?{'\n\n'}
              This will delete their profile and revoke access to the app.
            </Text>
          </View>
          <View style={styles.modalDivider} />
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={onClose}
              disabled={isDeleting}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalDestructiveBtn,
                pressed && styles.modalDestructiveBtnPressed,
              ]}
              onPress={onConfirm}
              disabled={isDeleting}>
              {isDeleting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.modalDestructiveText}>Deactivate</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DEPARTMENT_OPTIONS = ['logistica', 'admin', 'operations', 'warehouse', 'export'] as const;

type EditEmployeeForm = {
  name: string;
  employeeId: string;
  department: string;
};

const EMPTY_EDIT_FORM: EditEmployeeForm = {
  name: '',
  employeeId: '',
  department: '',
};

type EditEmployeeModalProps = {
  user: ManagedEmployee | null;
  onClose: () => void;
  onUpdated: (employee: ManagedEmployee) => void;
  onError: (title: string, message: string) => void;
};

function EditEmployeeModal({ user, onClose, onUpdated, onError }: EditEmployeeModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [editForm, setEditForm] = useState<EditEmployeeForm>(EMPTY_EDIT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setEditForm(EMPTY_EDIT_FORM);
      return;
    }
    setEditForm({
      name: user.name,
      employeeId: user.employeeId,
      department: user.department,
    });
  }, [user]);

  const resetAndClose = () => {
    setEditForm(EMPTY_EDIT_FORM);
    onClose();
  };

  async function handleSave() {
    if (!user) return;

    const name = editForm.name.trim();
    const employeeId = editForm.employeeId.trim();
    const department = editForm.department.trim();

    if (!name || !employeeId || !department) {
      onError('Missing fields', 'Name, employee ID, and department are required.');
      return;
    }

    setIsSaving(true);
    try {
      await updateEmployeeProfile(user.docId, { name, employeeId, department });
      const role = resolveRoleFromEmployee({ department }, user.email);
      onUpdated({
        ...user,
        name,
        employeeId,
        department,
        role,
      });
      resetAndClose();
    } catch {
      onError('Error', 'Could not save employee changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={!!user}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} />
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalAccent} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="person-outline" size={18} color={ACCENT} />
              </View>
              <Text style={styles.modalTitle}>Edit employee</Text>
            </View>
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              Update profile details for this account
            </Text>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email (read-only)</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{user?.email ?? '—'}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(name) => setEditForm((prev) => ({ ...prev, name }))}
                placeholder="Employee name"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Employee ID</Text>
              <TextInput
                style={styles.input}
                value={editForm.employeeId}
                onChangeText={(employeeId) =>
                  setEditForm((prev) => ({ ...prev, employeeId }))
                }
                placeholder="Employee ID"
                placeholderTextColor={colors.text.onSurfaceMuted}
                autoCapitalize="characters"
                editable={!isSaving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Department</Text>
              <Text style={[styles.readOnlyText, { marginBottom: 4 }]}>
                Admin access: logistica or admin
              </Text>
              <View style={styles.chipWrap}>
                {DEPARTMENT_OPTIONS.map((dept) => {
                  const active = editForm.department.toLowerCase() === dept;
                  return (
                    <Pressable
                      key={dept}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                      onPress={() => setEditForm((prev) => ({ ...prev, department: dept }))}
                      disabled={isSaving}>
                      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                        {dept}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalDivider} />
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={resetAndClose}
              disabled={isSaving}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalConfirmBtn,
                pressed && styles.modalConfirmBtnPressed,
              ]}
              onPress={() => void handleSave()}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={ACCENT} size="small" />
              ) : (
                <Text style={styles.modalConfirmText}>Save changes</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

function isLoggedInEmployee(
  employee: ManagedEmployee,
  authUid: string,
  authEmail: string | null | undefined,
): boolean {
  if (employee.docId === authUid) return true;
  const normalizedAuthEmail = authEmail?.trim().toLowerCase();
  if (normalizedAuthEmail && employee.email.trim().toLowerCase() === normalizedAuthEmail) {
    return true;
  }
  return false;
}

type UserManagementSectionProps = {
  /** Firebase Auth UID of the signed-in admin */
  currentAuthUid: string;
  currentAuthEmail?: string | null;
};

function areEmployeeListsEqual(
  previous: ManagedEmployee[],
  next: ManagedEmployee[],
): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const left = previous[index];
    const right = next[index];
    if (
      left.docId !== right.docId ||
      left.active !== right.active ||
      left.name !== right.name ||
      left.department !== right.department ||
      left.employeeId !== right.employeeId ||
      left.email !== right.email ||
      left.role !== right.role
    ) {
      return false;
    }
  }

  return true;
}

export function UserManagementSection({
  currentAuthUid,
  currentAuthEmail,
}: UserManagementSectionProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const [users, setUsers]               = useState<ManagedEmployee[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [editingUser, setEditingUser]   = useState<ManagedEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalState>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [infoModal, setInfoModal]       = useState<InfoModalState>(null);

  function showError(title: string, message: string) {
    setInfoModal({ title, message });
  }

  const loadUsers = useCallback(() => {
    setIsLoading(true);

    const unsubscribe = subscribeToAllEmployees(
      (list) => {
        setUsers((previous) => (areEmployeeListsEqual(previous, list) ? previous : list));
        setIsLoading(false);
      },
      () => {
        setUsers([]);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = loadUsers();
    return unsubscribe;
  }, [loadUsers]);

  function handleEmployeeUpdated(updated: ManagedEmployee) {
    setUsers((prev) =>
      prev.map((item) => (item.docId === updated.docId ? updated : item)),
    );
  }

  function requestDelete(employee: ManagedEmployee) {
    if (isLoggedInEmployee(employee, currentAuthUid, currentAuthEmail)) {
      Alert.alert(
        'Action Denied',
        'You cannot delete your own administrator account.',
      );
      return;
    }
    setDeleteTarget({ user: employee });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    if (isLoggedInEmployee(deleteTarget.user, currentAuthUid, currentAuthEmail)) {
      setDeleteTarget(null);
      Alert.alert(
        'Action Denied',
        'You cannot delete your own administrator account.',
      );
      return;
    }
    setIsDeleting(true);
    try {
      // Get admin's current ID token to authenticate the REST API call
      await deactivateEmployee(deleteTarget.user.docId);
      setUsers((prev) => prev.filter((u) => u.docId !== deleteTarget.user.docId));
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
      showError('Deactivate failed', 'Could not deactivate the employee. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Employee directory</Text>

      {isLoading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={32} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No employees found</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {users.map((user) => {
            const badge = roleBadgeStyle(user.role);
            const isSelf = isLoggedInEmployee(user, currentAuthUid, currentAuthEmail);
            return (
              <View key={user.docId} style={styles.userCard}>
                <View style={styles.userAccent} />
                <View style={styles.userBody}>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.name || user.email}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text.onSurfaceMuted }}>
                    {user.employeeId} · {user.department}
                    {!user.active ? ' · inactive' : ''}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconBtn,
                      { backgroundColor: pressed ? ACCENT_DIM : 'transparent' },
                    ]}
                    onPress={() => setEditingUser(user)}>
                    <Ionicons name="create-outline" size={19} color={colors.accent.primary} />
                  </Pressable>
                  {!isSelf ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.iconBtn,
                        { backgroundColor: pressed ? ACCENT_DIM : 'transparent' },
                      ]}
                      onPress={() => requestDelete(user)}>
                      <Ionicons name="trash-outline" size={19} color={colors.text.onSurfaceMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.text.secondary }}>
        New employees are provisioned in the Firestore employees collection (Auth + active
        record required).
      </Text>

      <EditEmployeeModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUpdated={handleEmployeeUpdated}
        onError={showError}
      />

      {/* Delete confirm modal */}
      <DeleteConfirmModal
        state={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        styles={styles}
      />

      {/* Info / error modal */}
      <AppInfoModal
        state={infoModal}
        onClose={() => setInfoModal(null)}
        styles={styles}
      />
    </>
  );
}
