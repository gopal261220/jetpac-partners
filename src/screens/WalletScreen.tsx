import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { useBuyFlow } from '../features/buy/context/BuyFlowContext';
import { colors } from '../theme/colors';

function getRelativeTimeLabel(isoDate: string) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

export function WalletScreen() {
  const { transactions, walletBalanceUsd } = useBuyFlow();
  const isLowBalance = walletBalanceUsd < 120;

  return (
    <ScreenContainer
      subtitle="Credits are manually preloaded. This screen helps operators track balance and deductions."
      title="Wallet"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconOrb}>
            <Ionicons color={colors.primaryStrong} name="wallet-outline" size={22} />
          </View>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Text style={styles.balanceAmount}>${walletBalanceUsd.toFixed(2)}</Text>
          <Text style={styles.balanceMeta}>Available to spend on the next pack purchase.</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons color={isLowBalance ? colors.danger : colors.primaryStrong} name="information-circle-outline" size={18} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>
              {isLowBalance ? 'Low balance' : 'Manual preload only'}
            </Text>
            <Text style={styles.infoBody}>
              {isLowBalance
                ? 'Ask operations to preload more credits soon. In-app top-ups are intentionally out of scope.'
                : 'Wallet funds are loaded manually by ops. The app only shows balance and purchase deductions.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction log</Text>
          {transactions.map((transaction) => {
            const isDebit = transaction.amountUsd < 0;

            return (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionCopy}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionMeta}>
                    {getRelativeTimeLabel(transaction.createdAt)} • Balance after ${transaction.balanceAfterUsd.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, isDebit ? styles.debit : styles.credit]}>
                  {isDebit ? '-' : '+'}${Math.abs(transaction.amountUsd).toFixed(2)}
                </Text>
              </View>
            );
          })}
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
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textSoft,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
  },
  balanceMeta: {
    fontSize: 14,
    lineHeight: 20,
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
    color: colors.text,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  transactionCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionCopy: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  transactionMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  debit: {
    color: colors.danger,
  },
  credit: {
    color: colors.primary,
  },
});
