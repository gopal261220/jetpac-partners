import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import type { VerifyOtpScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { isTenantAccessError } from '../errors';

export function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const { isNativeAuthSupported, sendEmailOtp, signInWithOtp, unsupportedMessage } = useAuth();
  const { email } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(120);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setResendCooldown((currentCooldown) => currentCooldown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const otpValue = otp.join('');
  const resendLabel = useMemo(() => {
    const minutes = Math.floor(resendCooldown / 60);
    const seconds = resendCooldown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [resendCooldown]);

  function getOtpErrorMessage(rawMessage: string) {
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('expired')) {
      return 'This code has expired. Request a new one and try again.';
    }

    if (
      normalizedMessage.includes('wrong email or verification code') ||
      normalizedMessage.includes('verification code') ||
      normalizedMessage.includes('invalid')
    ) {
      return 'The verification code is invalid. Please try again.';
    }

    return rawMessage;
  }

  function handleOtpChange(value: string, index: number) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setError('');

    if (value.length > 1) {
      const nextDigits = value.slice(0, 6).split('');
      const normalizedDigits = Array.from({ length: 6 }, (_, digitIndex) => nextDigits[digitIndex] ?? '');
      setOtp(normalizedDigits);
      const nextIndex = Math.min(value.length, 5);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) {
    if (event.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || !isNativeAuthSupported) {
      return;
    }

    setError('');
    setOtp(['', '', '', '', '', '']);
    setFocusedIndex(0);

    try {
      await sendEmailOtp(email);
      setResendCooldown(120);
      inputsRef.current[0]?.focus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to resend the code.');
    }
  }

  async function handleVerifyOtp() {
    setIsSubmitting(true);
    setError('');

    try {
      await signInWithOtp(email, otpValue);
    } catch (nextError) {
      if (isTenantAccessError(nextError)) {
        setOtp(['', '', '', '', '', '']);
        setFocusedIndex(0);
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'SignIn',
              params: {
                prefilledEmail: email,
                errorMessage: nextError.message,
              },
            },
          ],
        });
        return;
      }

      setError(
        nextError instanceof Error
          ? getOtpErrorMessage(nextError.message)
          : 'Unable to verify the OTP.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      error={error}
      subtitle={
        isNativeAuthSupported
          ? `We sent a 6-digit verification code to ${email}.`
          : unsupportedMessage ?? 'This auth flow is not available in the current runtime.'
      }
      title="Verify email"
    >
      {!isNativeAuthSupported ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Development build only</Text>
          <Text style={styles.infoBody}>
            Open the app in a native dev build to verify real Auth0 OTP codes.
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>One-time password</Text>
      <View style={styles.emailRow}>
        <Text style={styles.emailText}>{email}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.emailEditAction}>
          <Text style={styles.secondaryActionText}>Change email</Text>
        </Pressable>
      </View>
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(input) => {
              inputsRef.current[index] = input;
            }}
            autoFocus={index === 0}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => handleOtpChange(value, index)}
            onFocus={() => setFocusedIndex(index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            placeholder="0"
            placeholderTextColor="#9AA8A3"
            style={[
              styles.otpInput,
              focusedIndex === index && styles.otpInputActive,
              error ? styles.otpInputError : null,
            ]}
            textAlign="center"
            value={digit}
          />
        ))}
      </View>
      <PrimaryButton
        disabled={isSubmitting || otpValue.length !== 6 || !isNativeAuthSupported}
        label={isSubmitting ? 'Verifying...' : 'Verify OTP'}
        onPress={handleVerifyOtp}
      />
      <View style={styles.resendRow}>
        {resendCooldown > 0 ? (
          <Text style={styles.resendInfo}>Resend available in {resendLabel}</Text>
        ) : (
          <>
            <Text style={styles.resendInfo}>Didn’t get the code?</Text>
            <Pressable onPress={handleResendOtp} style={styles.resendAction}>
              <Text style={styles.secondaryActionText}>Resend</Text>
            </Pressable>
          </>
        )}
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emailText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emailEditAction: {
    paddingVertical: 2,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  otpInputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  otpInputError: {
    borderColor: colors.danger,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  resendRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  resendInfo: {
    fontSize: 14,
    color: colors.textMuted,
  },
  resendAction: {
    paddingVertical: 2,
  },
});
