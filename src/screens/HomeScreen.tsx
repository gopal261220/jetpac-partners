import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../features/auth/context/AuthContext';
import { useBuyFlow } from '../features/buy/context/BuyFlowContext';
import type { InventoryItem } from '../features/buy/types';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';

function getRelativeTimeLabel(isoDate: string) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

function buildRecentActivity(items: InventoryItem[]) {
  return items.slice(0, 4).map((item) => ({
    id: item.id,
    title: `${item.destinationName} • ${item.packName}`,
    subtitle: item.email ?? item.phone ?? 'Saved in inventory',
    time: getRelativeTimeLabel(item.createdAt),
    status: item.status,
  }));
}

function getStatusTone(status: string) {
  if (status === 'assigned') {
    return { backgroundColor: colors.primarySoft, color: colors.primaryStrong };
  }

  if (status === 'pending' || status === 'unassigned') {
    return { backgroundColor: colors.surfaceSoft, color: colors.primaryStrong };
  }

  return { backgroundColor: '#F7DEDA', color: colors.danger };
}

export function HomeScreen({ navigation }: AppTabScreenProps<'Home'>) {
  const { session } = useAuth();
  const { inventoryItems, totalEsimInventory, walletBalanceUsd } = useBuyFlow();
  const firstName =
    session?.user?.givenName ?? session?.user?.name?.split(' ')[0] ?? 'Partner Admin';

  const summary = useMemo(() => {
    const unassigned = inventoryItems.filter((item) => item.status === 'unassigned').length;
    const assignedToday = inventoryItems.filter((item) => item.status === 'assigned').length;
    const failed = inventoryItems.filter((item) => item.status === 'failed').length;

    return { unassigned, assignedToday, failed };
  }, [inventoryItems]);

  const recentActivity = useMemo(() => buildRecentActivity(inventoryItems), [inventoryItems]);
  const isLowBalance = walletBalanceUsd < 120;

  return (
    <ScreenContainer
      rightAction={
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          <Ionicons color={colors.primaryStrong} name="person-outline" size={18} />
        </Pressable>
      }
      subtitle="Quick partner dashboard for wallet, pack stock, eSIM bulk purchase, and follow-up."
      title={`Hi, ${firstName}`}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceHeaderCopy}>
              <Text style={styles.balanceEyebrow}>Wallet balance</Text>
              <Text style={styles.balanceAmount}>${walletBalanceUsd.toFixed(2)}</Text>
              <Text style={styles.balanceMeta}>
                Credits are preloaded manually and deducted whenever a pack is purchased.
              </Text>
            </View>
            <View style={styles.balanceIconOrb}>
              <Ionicons color={colors.surface} name="wallet-outline" size={20} />
            </View>
          </View>

          <View style={styles.balanceFooter}>
            <View style={styles.balanceStatus}>
              <View style={[styles.statusDot, isLowBalance && styles.statusDotLow]} />
              <Text style={styles.balanceStatusText}>
                {isLowBalance ? 'Low credit balance' : 'Ready for new purchases'}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Wallet')}
              style={({ pressed }) => [styles.creditButton, pressed && styles.cardPressed]}
            >
              <Ionicons color={colors.primaryStrong} name="add-circle-outline" size={16} />
              <Text style={styles.creditButtonText}>Add Credit</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => navigation.navigate('Inventory', { initialTab: 'packs', openPurchase: 'packs' })}
            style={({ pressed }) => [styles.actionCard, pressed && styles.cardPressed]}
          >
            <View style={styles.actionIconOrb}>
              <Ionicons color={colors.primaryStrong} name="bag-add-outline" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Get a Pack</Text>
              <Text style={styles.actionBody}>Run the same inventory purchase flow for destination packs.</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Inventory', { initialTab: 'esims', openPurchase: 'esims' })}
            style={({ pressed }) => [styles.actionCard, pressed && styles.cardPressed]}
          >
            <View style={styles.actionIconOrb}>
              <Ionicons color={colors.primaryStrong} name="qr-code-outline" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Get eSIM</Text>
              <Text style={styles.actionBody}>Buy bulk eSIM inventory fast. {totalEsimInventory} ready now.</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Inventory', { initialTab: 'packs' })}
            style={({ pressed }) => [styles.actionCard, pressed && styles.cardPressed]}
          >
            <View style={styles.actionIconOrb}>
              <Ionicons color={colors.primaryStrong} name="file-tray-stacked-outline" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Manage Inventory</Text>
              <Text style={styles.actionBody}>Review stock, retries, and unassigned packs.</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.metricsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today at a glance</Text>
            <Pressable onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.sectionLink}>Wallet details</Text>
            </Pressable>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCardLarge}>
              <View style={styles.metricIconOrb}>
                <Ionicons color={colors.primaryStrong} name="cube-outline" size={18} />
              </View>
              <Text style={styles.metricValueLarge}>{summary.unassigned}</Text>
              <Text style={styles.metricLabel}>Unassigned packs</Text>
            </View>

            <View style={styles.metricsColumn}>
              <View style={styles.metricCardSmall}>
                <Text style={styles.metricValueSmall}>{summary.assignedToday}</Text>
                <Text style={styles.metricLabel}>Assigned</Text>
              </View>
              <View style={styles.metricCardSmall}>
                <Text style={styles.metricValueSmall}>{summary.failed}</Text>
                <Text style={styles.metricLabel}>Needs retry</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Pressable onPress={() => navigation.navigate('Inventory')}>
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>

          {recentActivity.map((item) => {
            const tone = getStatusTone(item.status);

            return (
              <View key={item.id} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Ionicons color={colors.primaryStrong} name="globe-outline" size={16} />
                </View>
                <View style={styles.activityCopy}>
                  <View style={styles.activityTopRow}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <View style={[styles.activityChip, { backgroundColor: tone.backgroundColor }]}>
                      <Text style={[styles.activityChipText, { color: tone.color }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    gap: 20,
    paddingBottom: 24,
  },
  balanceCard: {
    borderRadius: 32,
    backgroundColor: colors.primary,
    padding: 22,
    gap: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  balanceHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  balanceEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.76)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.surface,
  },
  balanceMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.84)',
  },
  balanceIconOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9EF0D2',
  },
  statusDotLow: {
    backgroundColor: '#FFD2A8',
  },
  balanceStatusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.86)',
  },
  creditButton: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  creditButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  actionRow: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIconOrb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actionBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  cardPressed: {
    opacity: 0.92,
  },
  metricsSection: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  metricCardLarge: {
    flex: 1.1,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 12,
  },
  metricIconOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  metricValueLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  metricsColumn: {
    flex: 0.9,
    gap: 14,
  },
  metricCardSmall: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    justifyContent: 'center',
    gap: 6,
  },
  metricValueSmall: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  activitySection: {
    gap: 14,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 26,
    backgroundColor: colors.surface,
    padding: 18,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  activityCopy: {
    flex: 1,
    gap: 6,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  activityChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activityChipText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  activitySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSoft,
  },
});
