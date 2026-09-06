import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContinentalInspectLogo } from '@/components/ContinentalInspectLogo';
import { useAuth } from '@/context/AuthContext';
import { brand } from '@/theme/brand';
import { darkPalette } from '@/theme/palettes';
import { fonts } from '@/theme/typography';

const c = darkPalette;

/** Light surfaces on the sign-in card (always on black brand screen). */
const loginSurface = {
  card: '#FFFFFF',
  input: '#F3F4F6',
  inputBorder: '#D1D5DB',
  text: '#111111',
  textMuted: '#6B7280',
};

const ACCESS_DENIED_MESSAGES: Record<string, string> = {
  not_found:
    'Your account is not registered in the employee directory. Contact your supervisor.',
  inactive: 'Your account has been deactivated. Please contact management.',
  inspect_disabled:
    'Continental Inspect access is not enabled for your account. Ask an administrator in TimeTracker.',
  no_email: 'This account has no email. Use a corporate email to sign in.',
  firestore_unavailable:
    'Could not verify your employee record. Check your connection and try again.',
};

export default function LoginScreen() {
  const { signIn, user, profile, isLoading, isConfigured, accessDeniedReason } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (accessDeniedReason && ACCESS_DENIED_MESSAGES[accessDeniedReason]) {
      setError(ACCESS_DENIED_MESSAGES[accessDeniedReason]);
    }
  }, [accessDeniedReason]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={c.accent.primary} />
      </View>
    );
  }

  if (user && profile) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch {
      setError('Invalid credentials or connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.accentBar} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <ContinentalInspectLogo width={200} variant="onDark" showWordmark />
            <Text style={styles.locationLine}>{brand.panelTitle}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardHint}>Operator email and password</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={`operator@${brand.emailDomain}`}
              placeholderTextColor={loginSurface.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={loginSurface.textMuted}
              secureTextEntry
              editable={!isSubmitting}
            />

            {!isConfigured ? (
              <Text style={styles.error}>
                This install was built without Firebase credentials. Ask IT to run a new
                release build with environment variables configured.
              </Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isSubmitting || !isConfigured}>
              {isSubmitting ? (
                <ActivityIndicator color={c.text.onAccent} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.license}>{brand.license}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background.primary,
  },
  safe: {
    flex: 1,
    backgroundColor: c.background.primary,
  },
  accentBar: {
    height: 4,
    backgroundColor: c.accent.primary,
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 32,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  locationLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: c.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: loginSurface.card,
    borderRadius: 18,
    padding: 24,
    gap: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: c.accent.primary,
  },
  cardTitle: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 20,
    color: loginSurface.text,
    marginTop: 4,
    marginBottom: 2,
  },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: loginSurface.textMuted,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: loginSurface.text,
    marginTop: 4,
  },
  input: {
    backgroundColor: loginSurface.input,
    borderWidth: 1,
    borderColor: loginSurface.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    color: loginSurface.text,
  },
  error: {
    color: c.semantic.error,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    marginTop: 8,
    backgroundColor: c.accent.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: c.accent.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 16,
    color: c.text.onAccent,
    letterSpacing: 0.5,
  },
  license: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: c.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
