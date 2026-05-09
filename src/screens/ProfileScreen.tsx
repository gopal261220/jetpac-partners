import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../features/auth/context/AuthContext';
import { colors } from '../theme/colors';

export function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <ScreenContainer subtitle="Example non-tab route inside the signed-in stack." title="Profile">
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{session?.email}</Text>
        <Text style={styles.description}>
          This screen gives us a clean place to add organization settings and sign-out actions later.
        </Text>
        <PrimaryButton label="Logout" onPress={() => void signOut()} variant="secondary" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  email: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
