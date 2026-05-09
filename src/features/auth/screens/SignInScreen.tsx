import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import { useAuth } from '../context/AuthContext';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import type { SignInScreenProps } from '../../../navigation/types';

export function SignInScreen({ navigation }: SignInScreenProps) {
  const { requestOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    setIsSubmitting(true);
    setError('');

    try {
      const normalizedEmail = await requestOtp(email);
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
      subtitle="Use email-only sign in for kiosk operators. We will mock the OTP for now."
      title="Partner login"
    >
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
        disabled={isSubmitting}
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
});
