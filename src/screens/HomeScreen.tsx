import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../features/auth/context/AuthContext';
import { fetchHomeDashboard, type HomeDashboardData } from '../features/home/api/dashboard';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type RecentActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  status: string;
  amountLabel: string;
};

function getRelativeTimeLabel(isoDate: string) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatTransactionTitle(item: HomeDashboardData['wallet']['lastTransactions'][number]) {
  const productLabel = item.product === 'ESIM' ? 'eSIM' : 'Pack';

  if (item.transaction_type === 'PACK_ASSIGNMENT') {
    return `${productLabel} assignment`;
  }

  if (item.transaction_type === 'ESIM_PURCHASE') {
    return `${productLabel} purchase`;
  }

  return item.transaction_type.replace(/_/g, ' ').toLowerCase();
}

function getStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'completed' || normalizedStatus === 'assigned' || normalizedStatus === 'active') {
    return { backgroundColor: colors.primarySoft, color: colors.primaryStrong };
  }

  if (normalizedStatus === 'initiated' || normalizedStatus === 'pending') {
    return { backgroundColor: colors.surfaceSoft, color: colors.primaryStrong };
  }

  return { backgroundColor: '#F7DEDA', color: colors.danger };
}

export function HomeScreen({ navigation }: AppTabScreenProps<'Home'>) {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName =
    session?.user?.givenName ?? session?.user?.name?.split(' ')[0] ?? 'Partner Admin';

  const loadHomeDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextDashboard = await fetchHomeDashboard();
      setDashboard(nextDashboard);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load dashboard right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomeDashboard();
    }, [loadHomeDashboard])
  );

  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    if (!dashboard) {
      return [];
    }

    return dashboard.wallet.lastTransactions.slice(0, 5).map((item) => ({
      id: String(item.id),
      title: formatTransactionTitle(item),
      subtitle: `${item.product} • ${item.transaction_id}`,
      time: getRelativeTimeLabel(item.created_at),
      status: item.status.toLowerCase(),
      amountLabel: formatCurrency(item.amount, item.currency),
    }));
  }, [dashboard]);

  const walletStatusLabel =
    dashboard?.wallet.status === 'ACTIVE' ? 'Wallet active' : dashboard?.wallet.status ?? 'Unavailable';

  return (
    <ScreenContainer
      rightAction={
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
          <Ionicons color={colors.primaryStrong} name="person-outline" size={18} />
        </Pressable>
      }
      subtitle="Quick partner dashboard for wallet, pack top-ups, eSIM bulk purchase, and today’s sales."
      title={`Hi, ${firstName}`}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceHeaderCopy}>
              <Text style={styles.balanceEyebrow}>Wallet balance</Text>
              {isLoading ? (
                <View style={styles.balanceLoadingRow}>
                  <ActivityIndicator color={colors.surface} size="small" />
                  <Text style={styles.balanceLoadingText}>Fetching wallet balance</Text>
                </View>
              ) : (
                <Text style={styles.balanceAmount}>
                  {dashboard ? formatCurrency(dashboard.wallet.availableBalance, dashboard.wallet.currency) : '--'}
                </Text>
              )}
              <Text style={styles.balanceMeta}>
                {dashboard
                  ? `${walletStatusLabel} • last ${dashboard.wallet.lastTransactions.length} transactions available`
                  : 'Credits are preloaded manually and deducted whenever a pack is purchased.'}
              </Text>
            </View>
            <View style={styles.balanceIconOrb}>
              <Ionicons color={colors.surface} name="wallet-outline" size={20} />
            </View>
          </View>

          <View style={styles.balanceFooter}>
            <View style={styles.balanceStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.balanceStatusText}>{walletStatusLabel}</Text>
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
              <Text style={styles.actionBody}>Buy destination packs and allocate them to users in one flow.</Text>
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
              <Text style={styles.actionBody}>Buy bulk eSIM inventory in one quick quantity-based step.</Text>
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

          {isLoading ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator color={colors.primaryStrong} size="small" />
              <Text style={styles.loadingText}>Loading today’s summary</Text>
            </View>
          ) : dashboard ? (
            <View style={styles.metricsGrid}>
              <View style={styles.metricCardLarge}>
                <View style={styles.metricIconOrb}>
                  <Ionicons color={colors.primaryStrong} name="cash-outline" size={18} />
                </View>
                <Text style={styles.metricValueLarge}>
                  {formatCurrency(dashboard.ordersSummary.todayRevenueUsd, dashboard.ordersSummary.currency)}
                </Text>
                <Text style={styles.metricLabel}>Revenue today</Text>
              </View>

              <View style={styles.metricsColumn}>
                <View style={styles.metricCardSmall}>
                  <Text style={styles.metricValueSmall}>{dashboard.ordersSummary.todayPacksSold}</Text>
                  <Text style={styles.metricLabel}>Packs sold</Text>
                </View>
                <View style={styles.metricCardSmall}>
                  <Text style={styles.metricValueSmall}>{dashboard.ordersSummary.timezone}</Text>
                  <Text style={styles.metricLabel}>Timezone</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No summary available</Text>
              <Text style={styles.emptyStateBody}>{error ?? 'Could not load today’s summary right now.'}</Text>
            </View>
          )}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Pressable onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.sectionLink}>View wallet</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator color={colors.primaryStrong} size="small" />
              <Text style={styles.loadingText}>Loading recent transactions</Text>
            </View>
          ) : recentActivity.length ? (
            recentActivity.map((item) => {
              const tone = getStatusTone(item.status);

              return (
                <View key={item.id} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <Ionicons color={colors.primaryStrong} name="swap-horizontal-outline" size={16} />
                  </View>
                  <View style={styles.activityCopy}>
                    <View style={styles.activityTopRow}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <View style={[styles.activityChip, { backgroundColor: tone.backgroundColor }]}>
                        <Text style={[styles.activityChipText, { color: tone.color }]}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                    <View style={styles.activityFooter}>
                      <Text style={styles.activityTime}>{item.time}</Text>
                      <Text style={styles.activityAmount}>{item.amountLabel}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No recent transactions</Text>
              <Text style={styles.emptyStateBody}>{error ?? 'Transactions will appear here after purchases.'}</Text>
            </View>
          )}
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
    fontFamily: typography.heading,
    color: 'rgba(255,255,255,0.76)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.surface,
  },
  balanceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceLoadingText: {
    fontSize: 14,
    fontFamily: typography.body,
    color: 'rgba(255,255,255,0.9)',
  },
  balanceMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
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
  balanceStatusText: {
    fontSize: 13,
    fontFamily: typography.body,
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
    fontFamily: typography.heading,
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
    fontFamily: typography.heading,
    color: colors.text,
  },
  actionBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
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
    fontFamily: typography.heading,
    color: colors.text,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.heading,
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
    fontSize: 30,
    fontWeight: '700',
    fontFamily: typography.heading,
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
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: typography.body,
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
    fontFamily: typography.heading,
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
    fontFamily: typography.heading,
    textTransform: 'capitalize',
  },
  activitySubtitle: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textSoft,
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  loadingPanel: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  emptyStateCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  emptyStateBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
});
