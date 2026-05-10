import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
};

export function PrimaryButton({
  disabled = false,
  icon,
  label,
  onPress,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
  },
  labelPrimary: {
    color: colors.surface,
  },
  labelSecondary: {
    color: colors.text,
  },
});
