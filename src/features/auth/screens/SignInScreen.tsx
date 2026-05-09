import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import type { SignInScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';

export function SignInScreen({ navigation }: SignInScreenProps) {
  const { isNativeAuthSupported, sendEmailOtp, unsupportedMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    setIsSubmitting(true);
    setError('');

    try {
      const normalizedEmail = await sendEmailOtp(email);
      navigation.navigate('VerifyOtp', { email: normalizedEmail });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to continue right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      error={error}
      subtitle={
        isNativeAuthSupported
          ? 'Use the same staging email OTP flow as Jetpac. We will send a real verification code.'
          : unsupportedMessage ?? 'This auth flow is not available in the current runtime.'
      }
      title="Partner login"
    >
      {!isNativeAuthSupported ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Native dev build required</Text>
          <Text style={styles.infoBody}>
            Launch this app with a development build. Expo Go cannot run the native Auth0 SDK.
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Email address</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="admin@partner.com"
        placeholderTextColor="#7A869A"
        style={styles.input}
        value={email}
      />
      <PrimaryButton
        disabled={isSubmitting || !isNativeAuthSupported}
        label={isSubmitting ? 'Sending...' : 'Continue'}
        onPress={handleContinue}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    padding: 14,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
