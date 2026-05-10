import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '../components/BottomSheetModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { useBuyFlow } from '../features/buy/context/BuyFlowContext';
import { destinationCatalog } from '../features/buy/data/catalog';
import type { RequestedPack, StockGroup } from '../features/buy/types';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type InventoryTab = 'packs' | 'esims';
type PackFlowStep = 'destination' | 'packs' | 'allocation' | null;

type PurchaseRecipientDraft = {
  id: string;
  email: string;
  phone: string;
  quantities: Record<string, number>;
  isExpanded: boolean;
};

type FlowResultState = {
  title: string;
  body: string;
  accent: string;
};

function getRelativeTimeLabel(isoDate: string) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

function createRecipient(seed = Date.now()): PurchaseRecipientDraft {
  return {
    id: `recipient-${seed}`,
    email: '',
    phone: '',
    quantities: {},
    isExpanded: true,
  };
}

function recipientHasIdentity(recipient: { email: string; phone: string }) {
  return Boolean(recipient.email.trim() || recipient.phone.trim());
}

export function InventoryScreen({ navigation, route }: AppTabScreenProps<'Inventory'>) {
  const {
    buildAllocationPreview,
    buyRequestedPacksToInventory,
    esimInventoryBatches,
    inventoryItems,
    purchaseEsimsToInventory,
    stockGroups,
    submitAllocationPlan,
    totalEsimInventory,
    walletBalanceUsd,
  } = useBuyFlow();

  const [activeTab, setActiveTab] = useState<InventoryTab>(route.params?.initialTab ?? 'packs');
  const [packQuery, setPackQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [packSelections, setPackSelections] = useState<Record<string, number>>({});
  const [purchaseRecipients, setPurchaseRecipients] = useState<PurchaseRecipientDraft[]>([createRecipient()]);
  const [esimQuantity, setEsimQuantity] = useState(10);
  const [resultState, setResultState] = useState<FlowResultState | null>(null);
  const [packFlowStep, setPackFlowStep] = useState<PackFlowStep>(null);
  const [showEsimSheet, setShowEsimSheet] = useState(false);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (!route.params?.openPurchase) {
      return;
    }

    const nextTab = route.params.openPurchase === 'esims' ? 'esims' : 'packs';
    setActiveTab(nextTab);

    if (route.params.openPurchase === 'packs') {
      openPackPurchase();
    } else {
      setShowEsimSheet(true);
    }

    navigation.setParams({ openPurchase: undefined });
  }, [navigation, route.params?.openPurchase]);

  const filteredDestinations = useMemo(() => {
    const normalizedQuery = destinationQuery.trim().toLowerCase();

    return destinationCatalog.filter((destination) => {
      const haystack = `${destination.name} ${destination.region} ${destination.category}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [destinationQuery]);

  const selectedDestination = useMemo(
    () => destinationCatalog.find((destination) => destination.id === selectedDestinationId) ?? null,
    [selectedDestinationId]
  );

  const selectedPurchasePacks = useMemo(() => {
    if (!selectedDestination) {
      return [];
    }

    return selectedDestination.packs
      .map((pack) => ({
        destinationId: selectedDestination.id,
        destinationName: selectedDestination.name,
        destinationFlag: selectedDestination.flag,
        packId: pack.id,
        packName: pack.name,
        dataAllowance: pack.dataAllowance,
        validity: pack.validity,
        priceUsd: pack.priceUsd,
        quantity: packSelections[pack.id] ?? 0,
      }))
      .filter((pack) => pack.quantity > 0);
  }, [packSelections, selectedDestination]);

  const filteredStockGroups = useMemo(() => {
    const normalizedQuery = packQuery.trim().toLowerCase();

    return stockGroups.filter((group) => {
      const haystack =
        `${group.destinationName} ${group.packName} ${group.dataAllowance} ${group.validity}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [packQuery, stockGroups]);

  const recentPackActivity = useMemo(() => inventoryItems.slice(0, 6), [inventoryItems]);

  const allocationPreview = useMemo(() => {
    return buildAllocationPreview(
      purchaseRecipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        phone: recipient.phone,
        requestedPacks: selectedPurchasePacks.reduce<RequestedPack[]>((accumulator, pack) => {
          const quantity = recipient.quantities[pack.packId] ?? 0;

          if (quantity > 0) {
            accumulator.push({ ...pack, quantity });
          }

          return accumulator;
        }, []),
      }))
    );
  }, [buildAllocationPreview, purchaseRecipients, selectedPurchasePacks]);

  const allocationValidationErrors = useMemo(() => {
    const errors: string[] = [];
    const totalSelectedByPack = selectedPurchasePacks.reduce<Record<string, number>>((accumulator, pack) => {
      accumulator[pack.packId] = pack.quantity;
      return accumulator;
    }, {});
    const allocatedByPack = purchaseRecipients.reduce<Record<string, number>>((accumulator, recipient) => {
      Object.entries(recipient.quantities).forEach(([packId, quantity]) => {
        accumulator[packId] = (accumulator[packId] ?? 0) + quantity;
      });

      return accumulator;
    }, {});

    let actionableRecipients = 0;

    purchaseRecipients.forEach((recipient, index) => {
      const requestedCount = Object.values(recipient.quantities).reduce((sum, quantity) => sum + quantity, 0);

      if (requestedCount > 0 && !recipientHasIdentity(recipient)) {
        errors.push(`Recipient ${index + 1} needs an email or phone number.`);
      }

      if (recipientHasIdentity(recipient) && requestedCount === 0) {
        errors.push(`Recipient ${index + 1} needs at least one pack selected.`);
      }

      if (recipientHasIdentity(recipient) && requestedCount > 0) {
        actionableRecipients += 1;
      }
    });

    selectedPurchasePacks.forEach((pack) => {
      const allocated = allocatedByPack[pack.packId] ?? 0;

      if (allocated !== totalSelectedByPack[pack.packId]) {
        errors.push(`Allocate all ${pack.packName} units before completing purchase.`);
      }
    });

    if (!actionableRecipients) {
      errors.push('Add at least one user to allocate these packs.');
    }

    if (allocationPreview?.hasInsufficientBalance) {
      errors.push('Wallet balance is too low for this purchase.');
    }

    return errors;
  }, [allocationPreview, purchaseRecipients, selectedPurchasePacks]);

  const totalPackTopUpCost = useMemo(
    () => selectedPurchasePacks.reduce((sum, pack) => sum + pack.quantity * pack.priceUsd, 0),
    [selectedPurchasePacks]
  );

  const hasPackTopUpBalanceIssue = walletBalanceUsd < totalPackTopUpCost;
  const esimTotalCost = esimQuantity * 2.5;
  const hasEsimBalanceIssue = walletBalanceUsd < esimTotalCost;

  function closeAllPurchaseModals() {
    resetPackFlow();
    setShowEsimSheet(false);
  }

  function resetPackFlow() {
    setSelectedDestinationId(null);
    setPackSelections({});
    setPurchaseRecipients([createRecipient()]);
    setPackFlowStep(null);
    setDestinationQuery('');
  }

  function openPackPurchase() {
    resetPackFlow();
    setPackFlowStep('destination');
  }

  function prefillPackPurchase(group: StockGroup) {
    setSelectedDestinationId(group.destinationId);
    setPackSelections({ [group.packId]: 1 });
    setPurchaseRecipients([createRecipient()]);
    setPackFlowStep('packs');
  }

  function selectDestination(destinationId: string) {
    setSelectedDestinationId(destinationId);
    setPackSelections({});
    setPurchaseRecipients([createRecipient()]);
    setPackFlowStep('packs');
  }

  function updatePackSelection(packId: string, nextQuantity: number) {
    setPackSelections((current) => {
      const next = { ...current };

      if (nextQuantity <= 0) {
        delete next[packId];
        return next;
      }

      next[packId] = nextQuantity;
      return next;
    });
  }

  function addAllocationRecipient() {
    setPurchaseRecipients((current) => [...current, createRecipient(Date.now() + current.length)]);
  }

  function removeAllocationRecipient(recipientId: string) {
    setPurchaseRecipients((current) =>
      current.length === 1 ? current : current.filter((recipient) => recipient.id !== recipientId)
    );
  }

  function updateAllocationRecipientField(recipientId: string, field: 'email' | 'phone', value: string) {
    setPurchaseRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, [field]: value } : recipient
      )
    );
  }

  function updateAllocationQuantity(recipientId: string, packId: string, nextQuantity: number) {
    setPurchaseRecipients((current) =>
      current.map((recipient) => {
        if (recipient.id !== recipientId) {
          return recipient;
        }

        const nextQuantities = { ...recipient.quantities };

        if (nextQuantity <= 0) {
          delete nextQuantities[packId];
        } else {
          nextQuantities[packId] = nextQuantity;
        }

        return { ...recipient, quantities: nextQuantities };
      })
    );
  }

  function toggleAllocationRecipient(recipientId: string) {
    setPurchaseRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, isExpanded: !recipient.isExpanded } : recipient
      )
    );
  }

  function buySelectedPacksToInventory() {
    const result = buyRequestedPacksToInventory(selectedPurchasePacks);

    if (!result) {
      return;
    }

    setResultState({
      title: 'Pack inventory updated',
      body: `${result.preview.totalUnits} pack${result.preview.totalUnits === 1 ? '' : 's'} added to inventory.`,
      accent: colors.primaryStrong,
    });
    resetPackFlow();
  }

  function buyAndAllocateSelectedPacks() {
    const recipients = purchaseRecipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      phone: recipient.phone,
      requestedPacks: selectedPurchasePacks.reduce<RequestedPack[]>((accumulator, pack) => {
        const quantity = recipient.quantities[pack.packId] ?? 0;

        if (quantity > 0) {
          accumulator.push({ ...pack, quantity });
        }

        return accumulator;
      }, []),
    }));

    const result = submitAllocationPlan(recipients);

    if (!result) {
      return;
    }

    setResultState({
      title: 'Purchase and allocation complete',
      body: `${result.preview.totalUnits} pack${result.preview.totalUnits === 1 ? '' : 's'} handled across ${result.assignedCount + result.pendingCount + result.failedCount} assignment flow${result.assignedCount + result.pendingCount + result.failedCount === 1 ? '' : 's'}.`,
      accent: colors.primaryStrong,
    });
    resetPackFlow();
  }

  function buyEsims() {
    const batch = purchaseEsimsToInventory(esimQuantity);

    if (!batch) {
      return;
    }

    setResultState({
      title: 'eSIM inventory updated',
      body: `${batch.quantity} eSIM unit${batch.quantity === 1 ? '' : 's'} added to bulk inventory.`,
      accent: colors.primaryStrong,
    });
    setShowEsimSheet(false);
    setEsimQuantity(10);
  }

  return (
    <ScreenContainer
      subtitle="Manage pack and eSIM inventory, top up stock, and run stock purchase flows from one place."
      title="Inventory"
    >
      <View style={styles.tabRail}>
        <Pressable
          onPress={() => setActiveTab('packs')}
          style={[styles.tabChip, activeTab === 'packs' && styles.tabChipActive]}
        >
          <Text style={[styles.tabChipText, activeTab === 'packs' && styles.tabChipTextActive]}>
            Packs inventory
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('esims')}
          style={[styles.tabChip, activeTab === 'esims' && styles.tabChipActive]}
        >
          <Text style={[styles.tabChipText, activeTab === 'esims' && styles.tabChipTextActive]}>
            eSIM inventory
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'packs' ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Pack stock on hand</Text>
                <Text style={styles.heroBody}>
                  Browse stock, buy more destination packs, or allocate at purchase to multiple users.
                </Text>
              </View>
              <PrimaryButton label="Add packs" onPress={openPackPurchase} />
            </View>

            <View style={styles.searchField}>
              <Ionicons color={colors.textSoft} name="search-outline" size={18} />
              <TextInput
                onChangeText={setPackQuery}
                placeholder="Search destination or pack"
                placeholderTextColor={colors.textSoft}
                style={styles.searchInput}
                value={packQuery}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available pack inventory</Text>
              {filteredStockGroups.map((group) => (
                <View key={group.key} style={styles.stockCard}>
                  <View style={styles.stockCardTopRow}>
                    <View style={styles.stockCopy}>
                      <Text style={styles.stockTitle}>
                        {group.destinationFlag} {group.destinationName} • {group.packName}
                      </Text>
                      <Text style={styles.stockMeta}>
                        {group.dataAllowance} • {group.validity} • ${group.priceUsd.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.quantityPill}>
                      <Text style={styles.quantityPillText}>{group.availableQuantity}</Text>
                    </View>
                  </View>
                  <View style={styles.stockCardFooter}>
                    <Text style={styles.stockFooterMeta}>Ready in inventory</Text>
                    <Pressable onPress={() => prefillPackPurchase(group)} style={styles.inlineAction}>
                      <Text style={styles.inlineActionText}>Buy more</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent pack activity</Text>
              {recentPackActivity.map((item) => (
                <View key={item.id} style={styles.logCard}>
                  <Text style={styles.logTitle}>
                    {item.destinationFlag} {item.destinationName} • {item.packName}
                  </Text>
                  <Text style={styles.logMeta}>
                    {item.email ?? item.phone ?? 'Saved in inventory'} • {getRelativeTimeLabel(item.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Bulk eSIM stock</Text>
                <Text style={styles.heroBody}>
                  Top up eSIM inventory in quantity and keep stock ready for partner sales.
                </Text>
              </View>
              <PrimaryButton label="Buy eSIM" onPress={() => setShowEsimSheet(true)} />
            </View>

            <View style={styles.esimSummaryCard}>
              <View style={styles.esimSummaryCopy}>
                <Text style={styles.esimSummaryLabel}>Available eSIM quantity</Text>
                <Text style={styles.esimSummaryValue}>{totalEsimInventory}</Text>
              </View>
              <View style={styles.esimSummaryOrb}>
                <Ionicons color={colors.primaryStrong} name="qr-code-outline" size={20} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent eSIM top-ups</Text>
              {esimInventoryBatches.map((batch) => (
                <View key={batch.id} style={styles.logCard}>
                  <Text style={styles.logTitle}>
                    {batch.quantity} eSIM unit{batch.quantity === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.logMeta}>
                    ${batch.unitPriceUsd.toFixed(2)} each • {getRelativeTimeLabel(batch.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheetModal
        onBack={
          packFlowStep === 'packs'
            ? () => setPackFlowStep('destination')
            : packFlowStep === 'allocation'
              ? () => setPackFlowStep('packs')
              : undefined
        }
        onClose={closeAllPurchaseModals}
        subtitle={
          packFlowStep === 'destination'
            ? 'Start the inventory purchase flow by choosing a destination.'
            : packFlowStep === 'packs'
              ? selectedDestination
                ? `${selectedDestination.flag} ${selectedDestination.name}`
                : undefined
              : 'Split the selected packs across multiple users before purchase.'
        }
        title={
          packFlowStep === 'destination'
            ? 'Select destination'
            : packFlowStep === 'packs'
              ? 'Choose packs'
              : 'Allocate at purchase'
        }
        visible={Boolean(packFlowStep)}
      >
        {packFlowStep === 'destination' ? (
          <View style={styles.sheetContent}>
            <View style={styles.searchField}>
              <Ionicons color={colors.textSoft} name="search-outline" size={18} />
              <TextInput
                onChangeText={setDestinationQuery}
                placeholder="Search destinations"
                placeholderTextColor={colors.textSoft}
                style={styles.searchInput}
                value={destinationQuery}
              />
            </View>

            {filteredDestinations.map((destination) => (
              <Pressable
                key={destination.id}
                onPress={() => selectDestination(destination.id)}
                style={({ pressed }) => [styles.sheetCard, pressed && styles.cardPressed]}
              >
                <View style={styles.sheetCardCopy}>
                  <Text style={styles.sheetCardTitle}>
                    {destination.flag} {destination.name}
                  </Text>
                  <Text style={styles.sheetCardMeta}>
                    {destination.region} • {destination.category}
                  </Text>
                </View>
                <Ionicons color={colors.primaryStrong} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {packFlowStep === 'packs' && selectedDestination ? (
          <View style={styles.sheetContent}>
            {selectedDestination.packs.map((pack) => (
              <View key={pack.id} style={styles.packCard}>
                <View style={styles.packCardCopy}>
                  <Text style={styles.packCardTitle}>{pack.name}</Text>
                  <Text style={styles.packCardMeta}>
                    {pack.dataAllowance} • {pack.validity} • ${pack.priceUsd.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => updatePackSelection(pack.id, Math.max(0, (packSelections[pack.id] ?? 0) - 1))}
                    style={styles.stepperButton}
                  >
                    <Ionicons color={colors.primaryStrong} name="remove" size={14} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{packSelections[pack.id] ?? 0}</Text>
                  <Pressable
                    onPress={() => updatePackSelection(pack.id, (packSelections[pack.id] ?? 0) + 1)}
                    style={styles.stepperButton}
                  >
                    <Ionicons color={colors.primaryStrong} name="add" size={14} />
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected packs</Text>
                <Text style={styles.summaryValue}>
                  {selectedPurchasePacks.reduce((sum, pack) => sum + pack.quantity, 0)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Inventory top-up cost</Text>
                <Text style={styles.summaryValue}>${totalPackTopUpCost.toFixed(2)}</Text>
              </View>
              <Text style={styles.balanceHint}>Wallet balance ${walletBalanceUsd.toFixed(2)}</Text>
            </View>

            {hasPackTopUpBalanceIssue && selectedPurchasePacks.length ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Low balance for this top-up</Text>
                <Text style={styles.warningBody}>
                  Add credit from Wallet before completing this pack purchase.
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={!selectedPurchasePacks.length || hasPackTopUpBalanceIssue}
              label="Continue to allocation"
              onPress={() => setPackFlowStep('allocation')}
            />
            <PrimaryButton
              disabled={!selectedPurchasePacks.length || hasPackTopUpBalanceIssue}
              label="Buy for inventory"
              onPress={buySelectedPacksToInventory}
              variant="secondary"
            />
          </View>
        ) : null}

        {packFlowStep === 'allocation' ? (
          <View style={styles.sheetContent}>
            {selectedPurchasePacks.map((pack) => (
              <View key={pack.packId} style={styles.allocationSummaryCard}>
                <Text style={styles.allocationSummaryTitle}>{pack.packName}</Text>
                <Text style={styles.allocationSummaryMeta}>
                  {pack.quantity} selected • {pack.dataAllowance} • ${pack.priceUsd.toFixed(2)}
                </Text>
              </View>
            ))}

            {purchaseRecipients.map((recipient, index) => (
              <View key={recipient.id} style={styles.recipientCard}>
                <View style={styles.recipientHeader}>
                  <Text style={styles.recipientTitle}>Recipient {index + 1}</Text>
                  <View style={styles.recipientActions}>
                    <Pressable onPress={() => toggleAllocationRecipient(recipient.id)}>
                      <Text style={styles.inlineActionText}>{recipient.isExpanded ? 'Hide' : 'View'}</Text>
                    </Pressable>
                    {purchaseRecipients.length > 1 ? (
                      <Pressable onPress={() => removeAllocationRecipient(recipient.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {!recipient.isExpanded ? (
                  <Text style={styles.collapsedMeta}>
                    {recipient.email || recipient.phone || 'No user details'} •{' '}
                    {Object.values(recipient.quantities).reduce((sum, quantity) => sum + quantity, 0)} pack
                    {Object.values(recipient.quantities).reduce((sum, quantity) => sum + quantity, 0) === 1 ? '' : 's'}
                  </Text>
                ) : (
                  <>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={(value) => updateAllocationRecipientField(recipient.id, 'email', value)}
                      placeholder="Email"
                      placeholderTextColor={colors.textSoft}
                      style={styles.input}
                      value={recipient.email}
                    />
                    <TextInput
                      keyboardType="phone-pad"
                      onChangeText={(value) => updateAllocationRecipientField(recipient.id, 'phone', value)}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSoft}
                      style={styles.input}
                      value={recipient.phone}
                    />

                    {selectedPurchasePacks.map((pack) => {
                      const allocatedToOthers = purchaseRecipients.reduce((sum, entry) => {
                        if (entry.id === recipient.id) {
                          return sum;
                        }

                        return sum + (entry.quantities[pack.packId] ?? 0);
                      }, 0);
                      const availableForRecipient = pack.quantity - allocatedToOthers;
                      const currentQuantity = recipient.quantities[pack.packId] ?? 0;

                      return (
                        <View key={pack.packId} style={styles.packRow}>
                          <View style={styles.packCopy}>
                            <Text style={styles.packName}>{pack.packName}</Text>
                            <Text style={styles.packMeta}>
                              {pack.quantity} selected • {Math.max(0, availableForRecipient)} left
                            </Text>
                          </View>
                          <View style={styles.stepper}>
                            <Pressable
                              onPress={() =>
                                updateAllocationQuantity(recipient.id, pack.packId, Math.max(0, currentQuantity - 1))
                              }
                              style={styles.stepperButton}
                            >
                              <Ionicons color={colors.primaryStrong} name="remove" size={14} />
                            </Pressable>
                            <Text style={styles.stepperValue}>{currentQuantity}</Text>
                            <Pressable
                              onPress={() =>
                                updateAllocationQuantity(
                                  recipient.id,
                                  pack.packId,
                                  Math.min(pack.quantity, currentQuantity + 1)
                                )
                              }
                              style={[
                                styles.stepperButton,
                                currentQuantity >= availableForRecipient && styles.stepperButtonDisabled,
                              ]}
                            >
                              <Ionicons
                                color={currentQuantity >= availableForRecipient ? colors.textSoft : colors.primaryStrong}
                                name="add"
                                size={14}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            ))}

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Using stock first</Text>
                <Text style={styles.summaryValue}>{allocationPreview?.stockUnits ?? 0} packs</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Buying now</Text>
                <Text style={styles.summaryValue}>{allocationPreview?.purchaseUnits ?? 0} packs</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Wallet deduction</Text>
                <Text style={styles.summaryValue}>
                  ${allocationPreview?.walletDeductionUsd.toFixed(2) ?? '0.00'}
                </Text>
              </View>
            </View>

            {allocationValidationErrors.length ? (
              <View style={styles.warningCard}>
                {allocationValidationErrors.map((error) => (
                  <Text key={error} style={styles.warningBody}>
                    {error}
                  </Text>
                ))}
              </View>
            ) : null}

            <PrimaryButton label="Add another user" onPress={addAllocationRecipient} variant="secondary" />
            <PrimaryButton
              disabled={Boolean(allocationValidationErrors.length)}
              label="Purchase and allocate"
              onPress={buyAndAllocateSelectedPacks}
            />
            {allocationPreview?.hasInsufficientBalance ? (
              <PrimaryButton label="Go to Wallet" onPress={() => navigation.navigate('Wallet')} variant="secondary" />
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setShowEsimSheet(false)}
        subtitle="Buy bulk eSIM inventory with quantity only."
        title="Buy eSIM"
        visible={showEsimSheet}
      >
        <View style={styles.sheetContent}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>eSIM quantity</Text>
              <Text style={styles.summaryValue}>{esimQuantity}</Text>
            </View>
            <View style={styles.stepperCentered}>
              <Pressable
                onPress={() => setEsimQuantity((current) => Math.max(1, current - 1))}
                style={styles.stepperButton}
              >
                <Ionicons color={colors.primaryStrong} name="remove" size={16} />
              </Pressable>
              <Text style={styles.stepperLargeValue}>{esimQuantity}</Text>
              <Pressable
                onPress={() => setEsimQuantity((current) => current + 1)}
                style={styles.stepperButton}
              >
                <Ionicons color={colors.primaryStrong} name="add" size={16} />
              </Pressable>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unit price</Text>
              <Text style={styles.summaryValue}>$2.50</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Purchase total</Text>
              <Text style={styles.summaryValue}>${esimTotalCost.toFixed(2)}</Text>
            </View>
            <Text style={styles.balanceHint}>Wallet balance ${walletBalanceUsd.toFixed(2)}</Text>
          </View>

          {hasEsimBalanceIssue ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Low balance for eSIM purchase</Text>
              <Text style={styles.warningBody}>Add more wallet credit before buying this eSIM quantity.</Text>
            </View>
          ) : null}

          <PrimaryButton disabled={hasEsimBalanceIssue} label="Purchase eSIM" onPress={buyEsims} />
          {hasEsimBalanceIssue ? (
            <PrimaryButton label="Go to Wallet" onPress={() => navigation.navigate('Wallet')} variant="secondary" />
          ) : null}
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setResultState(null)}
        subtitle="Inventory updated successfully."
        title="Done"
        visible={Boolean(resultState)}
      >
        {resultState ? (
          <View style={styles.sheetContent}>
            <View style={styles.resultCard}>
              <View style={[styles.resultIconOrb, { backgroundColor: resultState.accent }]}>
                <Ionicons color={colors.surface} name="checkmark" size={20} />
              </View>
              <Text style={styles.resultTitle}>{resultState.title}</Text>
              <Text style={styles.resultBody}>{resultState.body}</Text>
            </View>
            <PrimaryButton label="Done" onPress={() => setResultState(null)} />
          </View>
        ) : null}
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRail: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  tabChip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.surface,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.textMuted,
  },
  tabChipTextActive: {
    color: colors.primaryStrong,
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  heroCopy: {
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: typography.body,
    color: colors.text,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  stockCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  stockCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stockCopy: {
    flex: 1,
    gap: 4,
  },
  stockTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  stockMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  quantityPill: {
    minWidth: 38,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  quantityPillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  stockCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockFooterMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textSoft,
  },
  inlineAction: {
    paddingVertical: 8,
  },
  inlineActionText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primary,
  },
  logCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 4,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  logMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  esimSummaryCard: {
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  esimSummaryCopy: {
    gap: 8,
  },
  esimSummaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: typography.heading,
    color: colors.textSoft,
  },
  esimSummaryValue: {
    fontSize: 34,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  esimSummaryOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  sheetContent: {
    gap: 14,
  },
  sheetCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetCardCopy: {
    flex: 1,
    gap: 4,
  },
  sheetCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  sheetCardMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  packCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packCardCopy: {
    flex: 1,
    gap: 4,
  },
  packCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  packCardMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  stepperValue: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  stepperLargeValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  balanceHint: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.primaryStrong,
  },
  warningCard: {
    borderRadius: 20,
    backgroundColor: '#FEF1E7',
    padding: 14,
    gap: 6,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: '#9A4C00',
  },
  warningBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: '#9A4C00',
  },
  allocationSummaryCard: {
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 4,
  },
  allocationSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  allocationSummaryMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  recipientCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recipientTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  recipientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.danger,
  },
  collapsedMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: typography.body,
    color: colors.text,
  },
  packRow: {
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packCopy: {
    flex: 1,
    gap: 3,
  },
  packName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  packMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  resultCard: {
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  resultIconOrb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  resultBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardPressed: {
    opacity: 0.92,
  },
});
