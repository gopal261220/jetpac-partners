import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../features/auth/context/AuthContext';
import { colors } from '../theme/colors';

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const companyName = session?.tenant?.companyName?.trim() || 'Jetpac Partner';

  return (
    <ScreenContainer
      subtitle="Account and organization details for the signed-in operator."
      title="Profile"
    >
      <View style={styles.heroCard}>
        <View style={styles.avatarOrb}>
          <Text style={styles.avatarText}>{companyName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.name}>{companyName}</Text>
          <Text style={styles.email}>{session?.email}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons color={colors.primaryStrong} name="business-outline" size={18} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Organization</Text>
            <Text style={styles.infoValue}>{companyName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons color={colors.primaryStrong} name="mail-outline" size={18} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Login email</Text>
            <Text style={styles.infoValue}>{session?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons color={colors.primaryStrong} name="shield-checkmark-outline" size={18} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Access</Text>
            <Text style={styles.infoValue}>Admin operator</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Session controls</Text>
        <Text style={styles.footerBody}>
          More organization settings can live here later, but logout is the only required action for now.
        </Text>
        <PrimaryButton label="Logout" onPress={() => void signOut()} variant="secondary" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 30,
    backgroundColor: colors.surface,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.surface,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 15,
    color: colors.textMuted,
  },
  sectionCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  infoCopy: {
    flex: 1,
    gap: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSoft,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footerCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 10,
  },
  footerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  footerBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
