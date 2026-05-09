import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';

type QuantityStepperProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function QuantityStepper({ onDecrease, onIncrease, value }: QuantityStepperProps) {
  return (
    <View style={styles.container}>
      <Pressable
        disabled={value === 0}
        onPress={onDecrease}
        style={({ pressed }) => [
          styles.button,
          value === 0 && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.symbol}>-</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable onPress={onIncrease} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.symbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  value: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});
