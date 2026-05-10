import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '../../../components/BottomSheetModal';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { BuyDestinationPdpScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { QuantityStepper } from '../components/QuantityStepper';
import { useBuyFlow } from '../context/BuyFlowContext';
import { findDestinationById } from '../data/catalog';
import type { PurchaseOutcome, RecipientDraft } from '../types';

const emptyRecipient: RecipientDraft = {
  email: '',
  phone: '',
};

function getOutcomeCopy(outcome: PurchaseOutcome['assignmentOutcome']) {
  if (outcome === 'assigned') {
    return {
      title: 'Assigned',
      body: 'Purchase and assignment completed.',
      icon: 'checkmark',
      iconBackground: colors.primary,
    };
  }

  if (outcome === 'pending') {
    return {
      title: 'Pending',
      body: 'Purchase completed and assignment is queued.',
      icon: 'time-outline',
      iconBackground: '#5D7181',
    };
  }

  if (outcome === 'failed') {
    return {
      title: 'Needs retry',
      body: 'Purchase completed. Inventory was saved for follow-up.',
      icon: 'alert-outline',
      iconBackground: colors.danger,
    };
  }

  return {
    title: 'Saved',
    body: 'Purchase completed and packs were kept in inventory.',
    icon: 'cube-outline',
    iconBackground: colors.primaryStrong,
  };
}

export function BuyDestinationPdpScreen({ navigation, route }: BuyDestinationPdpScreenProps) {
  const { destinationId } = route.params;
  const destination = findDestinationById(destinationId);
  const { buildPurchasePreview, completePurchase, walletBalanceUsd } = useBuyFlow();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [recipient, setRecipient] = useState<RecipientDraft>(emptyRecipient);
  const [isReviewVisible, setIsReviewVisible] = useState(false);
  const [purchaseOutcome, setPurchaseOutcome] = useState<PurchaseOutcome | null>(null);

  useEffect(() => {
    setQuantities({});
    setRecipient(emptyRecipient);
    setPurchaseOutcome(null);
    setIsReviewVisible(false);
  }, [destinationId]);

  const preview = useMemo(() => {
    if (!destination) {
      return null;
    }

    return buildPurchasePreview(destination, quantities);
  }, [buildPurchasePreview, destination, quantities]);

  const hasRecipient = Boolean(recipient.email.trim() || recipient.phone.trim());
  const hasInsufficientBalance = Boolean(preview && preview.walletBalanceAfterUsd < 0);

  function updateQuantity(packId: string, nextQuantity: number) {
    setQuantities((current) => ({
      ...current,
      [packId]: Math.max(0, nextQuantity),
    }));
  }

  function handlePurchase(nextRecipient: RecipientDraft) {
    if (!destination) {
      return;
    }

    const outcome = completePurchase(destination, quantities, nextRecipient);

    if (!outcome) {
      return;
    }

    setIsReviewVisible(false);
    setPurchaseOutcome(outcome);
    setQuantities({});
    setRecipient(emptyRecipient);
  }

  function closeOutcome() {
    setPurchaseOutcome(null);
    navigation.popToTop();
  }

  function openInventory() {
    setPurchaseOutcome(null);
    navigation.getParent()?.navigate('Inventory');
  }

  function openWallet() {
    navigation.getParent()?.navigate('Wallet');
  }

  if (!destination) {
    return (
      <ScreenContainer
        leftAction={
          <Pressable onPress={() => navigation.goBack()} style={styles.navAction}>
            <Text style={styles.navActionText}>Back</Text>
          </Pressable>
        }
        subtitle="The selected destination could not be found."
        title="Destination missing"
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Destination unavailable</Text>
          <Text style={styles.emptyDescription}>Go back and choose another destination.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      leftAction={
        <Pressable onPress={() => navigation.goBack()} style={styles.navAction}>
          <Text style={styles.navActionText}>Back</Text>
        </Pressable>
      }
      subtitle="Choose packs first. Purchase and assignment stay inside a quick sheet."
      title={destination.name}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroMain}>
            <View style={styles.heroFlagOrb}>
              <Text style={styles.heroFlag}>{destination.flag}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{destination.name}</Text>
              <Text numberOfLines={2} style={styles.heroMeta}>
                {destination.region}
              </Text>
            </View>
          </View>
          <View style={styles.balancePill}>
            <Ionicons color={colors.primaryStrong} name="wallet-outline" size={15} />
            <Text style={styles.balancePillText}>${walletBalanceUsd.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.packList}>
          {destination.packs.map((pack) => {
            const quantity = quantities[pack.id] ?? 0;

            return (
              <View key={pack.id} style={[styles.packCard, quantity > 0 && styles.packCardActive]}>
                <View style={styles.packCopy}>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <Text style={styles.packMeta}>
                    {pack.dataAllowance} • {pack.validity} • ${pack.priceUsd.toFixed(2)}
                  </Text>
                </View>
                <QuantityStepper
                  onDecrease={() => updateQuantity(pack.id, quantity - 1)}
                  onIncrease={() => updateQuantity(pack.id, quantity + 1)}
                  value={quantity}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footerCard}>
        <View style={styles.footerRow}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerLabel}>
              {preview?.totalUnits ?? 0} pack{preview?.totalUnits === 1 ? '' : 's'}
            </Text>
            <Text style={styles.footerBalance}>Balance ${walletBalanceUsd.toFixed(2)}</Text>
          </View>
          <Text style={styles.footerAmount}>${preview?.subtotalUsd.toFixed(2) ?? '0.00'}</Text>
        </View>
        {hasInsufficientBalance && preview ? (
          <View style={styles.warningCard}>
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>Low balance for this selection</Text>
              <Text style={styles.warningBody}>
                You need ${(preview.subtotalUsd - walletBalanceUsd).toFixed(2)} more to complete
                this purchase.
              </Text>
            </View>
            <Pressable onPress={openWallet} style={styles.warningAction}>
              <Text style={styles.warningActionText}>Add Balance</Text>
            </Pressable>
          </View>
        ) : null}
        <PrimaryButton
          disabled={!preview || hasInsufficientBalance}
          label="Continue"
          onPress={() => setIsReviewVisible(true)}
        />
      </View>

      <BottomSheetModal
        onClose={() => setIsReviewVisible(false)}
        subtitle={`${destination.flag} ${destination.name}`}
        title="Purchase"
        visible={isReviewVisible}
      >
        <View style={styles.sheetContent}>
          <View style={styles.recipientCard}>
            <View style={styles.recipientHeader}>
              <Text style={styles.recipientTitle}>Recipient details</Text>
              <Text style={styles.recipientHint}>
                Add email, phone, or both to assign the pack right after purchase. Leave blank to
                keep it in inventory for later.
              </Text>
            </View>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(value) => setRecipient((current) => ({ ...current, email: value }))}
              placeholder="Email"
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              value={recipient.email}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) => setRecipient((current) => ({ ...current, phone: value }))}
              placeholder="Phone"
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              value={recipient.phone}
            />
          </View>

          {preview ? (
            <View style={styles.selectionList}>
              {preview.lines.map((line) => (
                <View key={line.packId} style={styles.selectionRow}>
                  <Text style={styles.selectionName}>
                    {line.packName} x{line.quantity}
                  </Text>
                  <Text style={styles.selectionAmount}>${line.totalPriceUsd.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <Text style={styles.summaryLabel}>Purchase total</Text>
              <Text style={styles.summaryAmount}>${preview?.subtotalUsd.toFixed(2) ?? '0.00'}</Text>
            </View>
          </View>

          {hasInsufficientBalance ? (
            <Text style={styles.insufficientText}>Not enough wallet balance for this selection.</Text>
          ) : null}

          <View style={styles.sheetActions}>
            <PrimaryButton
              disabled={!preview || hasInsufficientBalance}
              label={hasRecipient ? 'Purchase & Assign' : 'Purchase Only'}
              onPress={() => handlePurchase(recipient)}
            />
            {hasRecipient ? (
              <PrimaryButton
                label="Skip assignment"
                onPress={() => handlePurchase(emptyRecipient)}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={closeOutcome}
        subtitle="Purchase flow completed."
        title="Result"
        visible={Boolean(purchaseOutcome)}
      >
        {purchaseOutcome ? (
          <View style={styles.sheetContent}>
            {(() => {
              const outcomeCopy = getOutcomeCopy(purchaseOutcome.assignmentOutcome);

              return (
                <View style={styles.resultCard}>
                  <View style={[styles.resultIconOrb, { backgroundColor: outcomeCopy.iconBackground }]}>
                    <Ionicons color={colors.surface} name={outcomeCopy.icon as never} size={22} />
                  </View>
                  <Text style={styles.resultTitle}>{outcomeCopy.title}</Text>
                  <Text style={styles.resultBody}>{outcomeCopy.body}</Text>
                  <Text style={styles.resultAmount}>
                    ${purchaseOutcome.preview.subtotalUsd.toFixed(2)}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.sheetActions}>
              <PrimaryButton label="Done" onPress={closeOutcome} />
              <PrimaryButton label="Inventory" onPress={openInventory} variant="secondary" />
            </View>
          </View>
        ) : null}
      </BottomSheetModal>
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
    fontFamily: typography.heading,
    color: colors.primary,
  },
  content: {
    gap: 14,
    paddingBottom: 20,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  heroFlagOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  heroFlag: {
    fontSize: 24,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  heroMeta: {
    fontSize: 13,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.primarySoft,
  },
  balancePillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  packList: {
    gap: 10,
  },
  packCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packCardActive: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  packCopy: {
    flex: 1,
    gap: 3,
  },
  packName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  packMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  footerCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerCopy: {
    flex: 1,
    gap: 2,
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  footerBalance: {
    fontSize: 13,
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  footerAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  warningCard: {
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningCopy: {
    flex: 1,
    gap: 3,
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.danger,
  },
  warningBody: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  warningAction: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
  },
  warningActionText: {
    fontSize: 12,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  emptyCard: {
    borderRadius: 26,
    backgroundColor: colors.surface,
    padding: 22,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  sheetContent: {
    gap: 12,
    paddingBottom: 8,
  },
  recipientCard: {
    gap: 10,
  },
  recipientHeader: {
    gap: 4,
  },
  recipientTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  recipientHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.text,
  },
  selectionList: {
    gap: 8,
  },
  selectionRow: {
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectionName: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.text,
  },
  selectionAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  summaryCard: {
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  insufficientText: {
    fontSize: 13,
    fontFamily: typography.body,
    color: colors.danger,
  },
  sheetActions: {
    gap: 10,
  },
  resultCard: {
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    padding: 18,
    gap: 10,
    alignItems: 'flex-start',
  },
  resultIconOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  resultBody: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  resultAmount: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
});
