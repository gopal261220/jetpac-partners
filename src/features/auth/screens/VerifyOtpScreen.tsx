import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import type { VerifyOtpScreenProps } from '../../../navigation/types';
import { useAuth } from '../context/AuthContext';
import { AuthScreenLayout } from '../components/AuthScreenLayout';

export function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const { signInWithOtp } = useAuth();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVerifyOtp() {
    setIsSubmitting(true);
    setError('');

    try {
      await signInWithOtp(email, otp);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to verify the OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      error={error}
      subtitle={`Demo code sent to ${email}. Use 123456 to complete the local login flow.`}
      title="Enter demo OTP"
    >
      <Text style={styles.label}>One-time password</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setOtp}
        placeholder="123456"
        placeholderTextColor="#7A869A"
        style={styles.input}
        value={otp}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label={isSubmitting ? 'Verifying...' : 'Verify OTP'}
        onPress={handleVerifyOtp}
      />
      <Pressable onPress={() => navigation.goBack()} style={styles.secondaryAction}>
        <Text style={styles.secondaryActionText}>Change email</Text>
      </Pressable>
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
  secondaryAction: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
