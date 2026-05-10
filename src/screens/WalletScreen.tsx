import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { fetchWalletScreenData, type WalletOrder, type WalletScreenData } from '../features/wallet/api/wallet';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type WalletActivityItem = {
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

function getStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'completed' || normalizedStatus === 'active') {
    return { backgroundColor: colors.primarySoft, color: colors.primaryStrong };
  }

  if (normalizedStatus === 'initiated' || normalizedStatus === 'pending') {
    return { backgroundColor: colors.surfaceSoft, color: colors.primaryStrong };
  }

  return { backgroundColor: '#F7DEDA', color: colors.danger };
}

function isEsimOrder(order: WalletOrder) {
  const normalizedTransactionType = order.transactionType?.trim().toLowerCase() ?? '';
  const normalizedProduct = order.product?.trim().toLowerCase() ?? '';

  return normalizedProduct === 'esim' || normalizedTransactionType === 'esim_purchase';
}

function formatTransactionTitle(order: WalletOrder) {
  const productLabel = isEsimOrder(order) ? 'eSIM' : 'Pack';
  const normalizedTransactionType = order.transactionType?.trim().toUpperCase() ?? '';

  if (normalizedTransactionType === 'PACK_ASSIGNMENT') {
    return `${productLabel} assignment`;
  }

  if (normalizedTransactionType === 'ESIM_PURCHASE') {
    return `${productLabel} purchase`;
  }

  return normalizedTransactionType ? normalizedTransactionType.replace(/_/g, ' ').toLowerCase() : productLabel;
}

export function WalletScreen() {
  const [walletData, setWalletData] = useState<WalletScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await fetchWalletScreenData();
      setWalletData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load wallet right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet])
  );

  const wallet = walletData?.wallet ?? null;
  const orders = walletData?.orders ?? [];
  const isLowBalance = (wallet?.availableBalance ?? 0) < 120;

  const orderCountLabel = useMemo(() => `${orders.length} recent order${orders.length === 1 ? '' : 's'}`, [orders]);
  const recentActivity = useMemo<WalletActivityItem[]>(
    () =>
      orders.map((order) => ({
        id: order.id
          ? String(order.id)
          : `${order.orderId}-${order.transactionId}-${order.createdAt}-${order.status}`,
        title: formatTransactionTitle(order),
        subtitle: `${order.product ?? (isEsimOrder(order) ? 'ESIM' : 'PACK')} • ${order.transactionId}`,
        time: getRelativeTimeLabel(order.createdAt),
        status: order.status.toLowerCase(),
        amountLabel: formatCurrency(order.soldPriceUsd || order.amountUsd || 0, order.currency),
      })),
    [orders]
  );

  return (
    <ScreenContainer
      subtitle="Credits are manually preloaded. Track live balance and the latest tenant orders here."
      title="Wallet"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconOrb}>
            <Ionicons color={colors.primaryStrong} name="wallet-outline" size={22} />
          </View>
          <Text style={styles.balanceLabel}>Current balance</Text>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primaryStrong} size="small" />
              <Text style={styles.loadingText}>Fetching wallet balance</Text>
            </View>
          ) : (
            <Text style={styles.balanceAmount}>
              {wallet ? formatCurrency(wallet.availableBalance, wallet.currency) : '--'}
            </Text>
          )}
          <Text style={styles.balanceMeta}>
            {wallet ? `${wallet.status} • ${orderCountLabel}` : 'Available to spend on the next pack purchase.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            color={isLowBalance ? colors.danger : colors.primaryStrong}
            name="information-circle-outline"
            size={18}
          />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{isLowBalance ? 'Low balance' : 'Manual preload only'}</Text>
            <Text style={styles.infoBody}>
              {wallet
                ? isLowBalance
                  ? 'Ask operations to preload more credits soon. In-app top-ups are intentionally out of scope.'
                  : `Wallet status is ${wallet.status.toLowerCase()}. Credits are deducted from this balance for partner orders.`
                : error ?? 'Wallet details are temporarily unavailable.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>

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
  content: {
    gap: 16,
    paddingBottom: 20,
  },
  balanceCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 8,
  },
  balanceIconOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.heading,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textSoft,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: typography.heading,
    color: colors.text,
  },
  balanceMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.heading,
    color: colors.text,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.heading,
    color: colors.text,
  },
  loadingPanel: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  activityCopy: {
    flex: 1,
    gap: 4,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.heading,
    color: colors.text,
  },
  activitySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  activityChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activityChipText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.heading,
    textTransform: 'uppercase',
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textSoft,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.heading,
    color: colors.text,
  },
  emptyStateCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
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
