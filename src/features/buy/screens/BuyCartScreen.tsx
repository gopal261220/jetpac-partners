import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { CartScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { useBuyCart } from '../context/BuyCartContext';

export function BuyCartScreen({ navigation }: CartScreenProps) {
  const { clearCart, destinationCount, itemCount, lines, removeLine, subtotal } = useBuyCart();

  const groupedLines = useMemo(() => {
    return lines.reduce<
      Array<{
        destinationId: string;
        destinationName: string;
        destinationFlag: string;
        lines: typeof lines;
      }>
    >((accumulator, line) => {
      const existingGroup = accumulator.find((group) => group.destinationId === line.destinationId);

      if (existingGroup) {
        existingGroup.lines.push(line);
        return accumulator;
      }

      accumulator.push({
        destinationId: line.destinationId,
        destinationName: line.destinationName,
        destinationFlag: line.destinationFlag,
        lines: [line],
      });
      return accumulator;
    }, []);
  }, [lines]);

  return (
    <ScreenContainer
      leftAction={
        <Pressable onPress={() => navigation.goBack()} style={styles.navAction}>
          <Text style={styles.navActionText}>Back</Text>
        </Pressable>
      }
      subtitle="Multiple destinations and pack quantities stay grouped here for review."
      title="Cart"
    >
      {lines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDescription}>
            Add packs from destination PDP pages to start building a purchase.
          </Text>
          <PrimaryButton label="Browse destinations" onPress={() => navigation.navigate('DestinationList')} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.cartContent} showsVerticalScrollIndicator={false}>
            {groupedLines.map((group) => (
              <View key={group.destinationId} style={styles.destinationGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {group.destinationFlag} {group.destinationName}
                  </Text>
                  <Text style={styles.groupMeta}>{group.lines.length} pack types</Text>
                </View>

                {group.lines.map((line) => (
                  <View key={line.packId} style={styles.lineRow}>
                    <View style={styles.lineCopy}>
                      <Text style={styles.lineTitle}>{line.packName}</Text>
                      <Text style={styles.lineMeta}>
                        {line.dataAllowance} • {line.validity} • Qty {line.quantity}
                      </Text>
                    </View>
                    <View style={styles.lineActions}>
                      <Text style={styles.linePrice}>${(line.priceUsd * line.quantity).toFixed(2)}</Text>
                      <Pressable
                        onPress={() => removeLine(line.destinationId, line.packId)}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTitle}>
                {itemCount} total units across {destinationCount} destinations
              </Text>
              <Text style={styles.summaryAmount}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryActions}>
              <PrimaryButton
                label="Keep shopping"
                onPress={() => navigation.navigate('DestinationList')}
                variant="secondary"
              />
              <PrimaryButton label="Clear cart" onPress={clearCart} variant="secondary" />
            </View>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navAction: {
    paddingVertical: 8,
    paddingRight: 10,
  },
  navActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  cartContent: {
    gap: 12,
    paddingBottom: 12,
  },
  destinationGroup: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  groupMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  lineCopy: {
    flex: 1,
    gap: 4,
  },
  lineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  lineMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  lineActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  linePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  removeButton: {
    paddingVertical: 4,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryActions: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
