import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { BottomSheetModal } from '../components/BottomSheetModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { assignPackOrders } from '../features/buy/api/assign';
import { fetchDestinationCatalog } from '../features/buy/api/destinations';
import { fetchEsimInventory, type EsimInventoryFilter, type EsimInventoryItem } from '../features/buy/api/esimInventory';
import { orderEsims } from '../features/buy/api/esims';
import { fetchDestinationPacks } from '../features/buy/api/packs';
import { useBuyFlow } from '../features/buy/context/BuyFlowContext';
import { destinationCatalog } from '../features/buy/data/catalog';
import type { DestinationCatalog, StockGroup } from '../features/buy/types';
import { fetchWalletScreenData } from '../features/wallet/api/wallet';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type InventoryTab = 'packs' | 'esims';
type PackFlowStep = 'destination' | 'packs' | 'allocation' | null;

type PurchaseRecipientDraft = {
  email: string;
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
    email: '',
  };
}

function getEsimStatusTone(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'active' || normalizedStatus === 'installed') {
    return {
      chip: styles.allocatedChip,
      text: styles.allocatedChipText,
    };
  }

  return {
    chip: styles.availableChip,
    text: styles.availableChipText,
  };
}

export function InventoryScreen({ navigation, route }: AppTabScreenProps<'Inventory'>) {
  const {
    buyRequestedPacksToInventory,
    completePurchase,
    inventoryItems,
    stockGroups,
  } = useBuyFlow();

  const [activeTab, setActiveTab] = useState<InventoryTab>(route.params?.initialTab ?? 'packs');
  const [packQuery, setPackQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState<DestinationCatalog[]>(destinationCatalog);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [packSelections, setPackSelections] = useState<Record<string, number>>({});
  const [purchaseRecipient, setPurchaseRecipient] = useState<PurchaseRecipientDraft>(createRecipient());
  const [esimQuantityInput, setEsimQuantityInput] = useState('10');
  const [resultState, setResultState] = useState<FlowResultState | null>(null);
  const [packFlowStep, setPackFlowStep] = useState<PackFlowStep>(null);
  const [showEsimSheet, setShowEsimSheet] = useState(false);
  const [isSubmittingPackPurchase, setIsSubmittingPackPurchase] = useState(false);
  const [purchaseSubmitError, setPurchaseSubmitError] = useState<string | null>(null);
  const [isSubmittingEsimPurchase, setIsSubmittingEsimPurchase] = useState(false);
  const [esimSubmitError, setEsimSubmitError] = useState<string | null>(null);
  const [esimFilter, setEsimFilter] = useState<EsimInventoryFilter>('all');
  const [esimInventoryItems, setEsimInventoryItems] = useState<EsimInventoryItem[]>([]);
  const [allEsimInventoryItems, setAllEsimInventoryItems] = useState<EsimInventoryItem[]>([]);
  const [isLoadingEsimInventory, setIsLoadingEsimInventory] = useState(false);
  const [esimInventoryError, setEsimInventoryError] = useState<string | null>(null);
  const [liveWalletBalanceUsd, setLiveWalletBalanceUsd] = useState<number | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;

      async function loadWalletSummary() {
        try {
          const response = await fetchWalletScreenData(1);

          if (!isCancelled) {
            setLiveWalletBalanceUsd(response.wallet.availableBalance);
          }
        } catch {
          if (!isCancelled) {
            setLiveWalletBalanceUsd(null);
          }
        }
      }

      void loadWalletSummary();

      return () => {
        isCancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadDestinations() {
      setIsLoadingDestinations(true);
      setDestinationsError(null);

      try {
        const nextDestinations = await fetchDestinationCatalog();

        if (!isCancelled) {
          setAvailableDestinations(nextDestinations);
        }
      } catch (error) {
        if (!isCancelled) {
          setDestinationsError(error instanceof Error ? error.message : 'Could not load destinations right now.');
          setAvailableDestinations(destinationCatalog);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDestinations(false);
        }
      }
    }

    void loadDestinations();

    return () => {
      isCancelled = true;
    };
  }, []);

  const refreshEsimInventoryData = useCallback(
    async (nextFilter = esimFilter) => {
      setIsLoadingEsimInventory(true);
      setEsimInventoryError(null);

      try {
        const [nextItems, allItems] = await Promise.all([
          fetchEsimInventory(nextFilter),
          fetchEsimInventory('all'),
        ]);

        setEsimInventoryItems(nextItems);
        setAllEsimInventoryItems(allItems);
      } catch (error) {
        setEsimInventoryError(error instanceof Error ? error.message : 'Could not load eSIM inventory.');
      } finally {
        setIsLoadingEsimInventory(false);
      }
    },
    [esimFilter]
  );

  useEffect(() => {
    if (activeTab !== 'esims') {
      return;
    }

    void refreshEsimInventoryData();
  }, [activeTab, refreshEsimInventoryData]);

  const filteredDestinations = useMemo(() => {
    const normalizedQuery = destinationQuery.trim().toLowerCase();

    return availableDestinations.filter((destination) => {
      const haystack = `${destination.name} ${destination.region} ${destination.category}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [availableDestinations, destinationQuery]);

  const selectedDestination = useMemo(
    () => availableDestinations.find((destination) => destination.id === selectedDestinationId) ?? null,
    [availableDestinations, selectedDestinationId]
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

  const totalPackTopUpCost = useMemo(
    () => selectedPurchasePacks.reduce((sum, pack) => sum + pack.quantity * pack.priceUsd, 0),
    [selectedPurchasePacks]
  );

  const effectiveWalletBalanceUsd = liveWalletBalanceUsd ?? 0;
  const hasPackTopUpBalanceIssue = effectiveWalletBalanceUsd < totalPackTopUpCost;
  const esimQuantity = useMemo(() => {
    const parsedQuantity = Number.parseInt(esimQuantityInput, 10);

    if (Number.isNaN(parsedQuantity)) {
      return 0;
    }

    return Math.max(0, parsedQuantity);
  }, [esimQuantityInput]);
  const esimTotalCost = esimQuantity * 1;
  const hasEsimBalanceIssue = esimQuantity > 0 && effectiveWalletBalanceUsd < esimTotalCost;
  const totalEsimInventory = allEsimInventoryItems.length;

  async function refreshWalletSummary() {
    try {
      const response = await fetchWalletScreenData(1);
      setLiveWalletBalanceUsd(response.wallet.availableBalance);
    } catch {
      setLiveWalletBalanceUsd(null);
    }
  }

  function closeAllPurchaseModals() {
    resetPackFlow();
    setShowEsimSheet(false);
    setEsimSubmitError(null);
    setIsSubmittingEsimPurchase(false);
    setEsimQuantityInput('10');
  }

  function resetPackFlow() {
    setSelectedDestinationId(null);
    setPackSelections({});
    setPurchaseRecipient(createRecipient());
    setPackFlowStep(null);
    setDestinationQuery('');
    setPacksError(null);
    setIsLoadingPacks(false);
    setPurchaseSubmitError(null);
    setIsSubmittingPackPurchase(false);
  }

  function openPackPurchase() {
    resetPackFlow();
    setPackFlowStep('destination');
  }

  async function retryLoadDestinations() {
    setIsLoadingDestinations(true);
    setDestinationsError(null);

    try {
      const nextDestinations = await fetchDestinationCatalog();
      setAvailableDestinations(nextDestinations);
    } catch (error) {
      setDestinationsError(error instanceof Error ? error.message : 'Could not load destinations right now.');
      setAvailableDestinations(destinationCatalog);
    } finally {
      setIsLoadingDestinations(false);
    }
  }

  function prefillPackPurchase(group: StockGroup) {
    setSelectedDestinationId(group.destinationId);
    setPackSelections({ [group.packId]: 1 });
    setPurchaseRecipient(createRecipient());
    setPackFlowStep('packs');
    setPacksError(null);
  }

  async function loadPacksForDestination(destination: DestinationCatalog) {
    setIsLoadingPacks(true);
    setPacksError(null);

    try {
      const packs = await fetchDestinationPacks(destination.apiName ?? destination.id);

      setAvailableDestinations((current) =>
        current.map((item) => (item.id === destination.id ? { ...item, packs: packs.length ? packs : item.packs } : item))
      );
    } catch (error) {
      setPacksError(error instanceof Error ? error.message : 'Could not load packs right now.');
    } finally {
      setIsLoadingPacks(false);
    }
  }

  async function selectDestination(destinationId: string) {
    const destination = availableDestinations.find((item) => item.id === destinationId) ?? null;

    setSelectedDestinationId(destinationId);
    setPackSelections({});
    setPurchaseRecipient(createRecipient());
    setPackFlowStep('packs');

    if (destination) {
      await loadPacksForDestination(destination);
    }
  }

  async function retryLoadPacks() {
    if (!selectedDestination) {
      return;
    }

    await loadPacksForDestination(selectedDestination);
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

  function updatePurchaseRecipientEmail(value: string) {
    setPurchaseRecipient({ email: value });
  }

  async function syncPackAssignments(receiverUserId?: string) {
    const requests = selectedPurchasePacks.flatMap((pack) => {
      const catalogId = pack.packId;

      if (!catalogId) {
        return [];
      }

      return Array.from({ length: pack.quantity }, () => ({
        catalogId,
        receiverUserId,
      }));
    });

    if (!requests.length) {
      return;
    }

    await assignPackOrders(requests);
  }

  async function buySelectedPacksToInventory() {
    setIsSubmittingPackPurchase(true);
    setPurchaseSubmitError(null);

    try {
      await syncPackAssignments();

      const result = buyRequestedPacksToInventory(selectedPurchasePacks);

      if (!result) {
        return;
      }

      setResultState({
        title: 'Pack inventory updated',
        body: `${result.preview.totalUnits} pack${result.preview.totalUnits === 1 ? '' : 's'} added to inventory.`,
        accent: colors.primaryStrong,
      });
      await refreshWalletSummary();
      resetPackFlow();
    } catch (error) {
      setPurchaseSubmitError(error instanceof Error ? error.message : 'Could not complete this purchase.');
    } finally {
      setIsSubmittingPackPurchase(false);
    }
  }

  async function buyAndAllocateSelectedPacks() {
    if (!selectedDestination) {
      return;
    }

    setIsSubmittingPackPurchase(true);
    setPurchaseSubmitError(null);

    try {
      const receiverUserId = purchaseRecipient.email.trim() || undefined;

      await syncPackAssignments(receiverUserId);

      const result = completePurchase(selectedDestination, packSelections, {
        email: receiverUserId ?? '',
        phone: '',
      });

      if (!result) {
        return;
      }

      setResultState({
        title: receiverUserId ? 'Purchase and assignment complete' : 'Purchase complete',
        body: receiverUserId
          ? `${result.preview.totalUnits} pack${result.preview.totalUnits === 1 ? '' : 's'} assigned to ${receiverUserId}.`
          : `${result.preview.totalUnits} pack${result.preview.totalUnits === 1 ? '' : 's'} added to inventory without assignment.`,
        accent: colors.primaryStrong,
      });
      await refreshWalletSummary();
      resetPackFlow();
    } catch (error) {
      setPurchaseSubmitError(error instanceof Error ? error.message : 'Could not complete this purchase.');
    } finally {
      setIsSubmittingPackPurchase(false);
    }
  }

  async function buyEsims() {
    if (esimQuantity < 1) {
      setEsimSubmitError('Enter a valid eSIM quantity.');
      return;
    }

    setIsSubmittingEsimPurchase(true);
    setEsimSubmitError(null);

    try {
      await orderEsims(esimQuantity);
      await Promise.all([refreshWalletSummary(), refreshEsimInventoryData()]);

      setResultState({
        title: 'eSIM inventory updated',
        body: `${esimQuantity} eSIM unit${esimQuantity === 1 ? '' : 's'} added to bulk inventory.`,
        accent: colors.primaryStrong,
      });
      setShowEsimSheet(false);
      setEsimQuantityInput('10');
    } catch (error) {
      setEsimSubmitError(error instanceof Error ? error.message : 'Could not place this eSIM order.');
    } finally {
      setIsSubmittingEsimPurchase(false);
    }
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>eSIM history</Text>
              </View>

              <View style={styles.filterRail}>
                {(['all', 'active', 'released', 'installed'] as EsimInventoryFilter[]).map((filter) => {
                  const isActive = filter === esimFilter;

                  return (
                    <Pressable
                      key={filter}
                      onPress={() => setEsimFilter(filter)}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {filter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {isLoadingEsimInventory ? (
                <View style={styles.loadingPanel}>
                  <ActivityIndicator color={colors.primaryStrong} size="small" />
                  <Text style={styles.loadingText}>Loading eSIM inventory</Text>
                </View>
              ) : esimInventoryError ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningBody}>{esimInventoryError}</Text>
                </View>
              ) : esimInventoryItems.length ? (
                esimInventoryItems.map((item) => {
                  const tone = getEsimStatusTone(item.status);

                  return (
                    <View key={item.id} style={styles.logCard}>
                      <View style={styles.logTopRow}>
                        <Text style={styles.logTitle}>{item.iccid}</Text>
                        <View style={[styles.statusChip, tone.chip]}>
                          <Text style={[styles.statusChipText, tone.text]}>
                            {item.status.toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.logMeta}>
                        {item.userEmail ?? item.userId ?? 'Unassigned'} • {getRelativeTimeLabel(item.updatedAt)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No eSIM records found</Text>
                  <Text style={styles.emptyStateBody}>Try another filter or purchase more eSIM inventory.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheetModal
        footer={
          packFlowStep === 'packs' ? (
            <>
              <View style={styles.stickySummaryCard}>
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
                <Text style={styles.balanceHint}>Wallet balance ${effectiveWalletBalanceUsd.toFixed(2)}</Text>
              </View>
              <PrimaryButton
                disabled={!selectedPurchasePacks.length || hasPackTopUpBalanceIssue || isLoadingPacks}
                label="Continue to allocation"
                onPress={() => setPackFlowStep('allocation')}
              />
              <PrimaryButton
                disabled={!selectedPurchasePacks.length || hasPackTopUpBalanceIssue || isLoadingPacks || isSubmittingPackPurchase}
                label={isSubmittingPackPurchase ? 'Buying...' : 'Buy for inventory'}
                onPress={buySelectedPacksToInventory}
                variant="secondary"
              />
            </>
          ) : packFlowStep === 'allocation' ? (
            <>
              <View style={styles.stickySummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Selected units</Text>
                  <Text style={styles.summaryValue}>
                    {selectedPurchasePacks.reduce((sum, pack) => sum + pack.quantity, 0)} packs
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Buying now</Text>
                  <Text style={styles.summaryValue}>
                    {selectedPurchasePacks.reduce((sum, pack) => sum + pack.quantity, 0)} packs
                  </Text>
                </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Wallet deduction</Text>
                <Text style={styles.summaryValue}>${totalPackTopUpCost.toFixed(2)}</Text>
              </View>
              <Text style={styles.balanceHint}>Wallet balance ${effectiveWalletBalanceUsd.toFixed(2)}</Text>
            </View>
              <PrimaryButton
                disabled={!selectedPurchasePacks.length || hasPackTopUpBalanceIssue || isSubmittingPackPurchase}
                label={
                  isSubmittingPackPurchase
                    ? 'Processing...'
                    : purchaseRecipient.email.trim()
                      ? 'Purchase and assign'
                      : 'Buy without assignment'
                }
                onPress={buyAndAllocateSelectedPacks}
              />
              {hasPackTopUpBalanceIssue ? (
                <PrimaryButton
                  label="Go to Wallet"
                  onPress={() => navigation.navigate('Wallet')}
                  variant="secondary"
                />
              ) : null}
            </>
          ) : undefined
        }
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

            {isLoadingDestinations ? (
              <View style={styles.emptyStateCard}>
                <View style={styles.loadingStateRow}>
                  <ActivityIndicator color={colors.primaryStrong} size="small" />
                  <View style={styles.loadingStateCopy}>
                    <Text style={styles.emptyStateTitle}>Refreshing destinations</Text>
                    <Text style={styles.emptyStateBody}>
                      You can keep using the current list while we fetch the latest destinations.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {destinationsError ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Could not refresh destinations</Text>
                <Text style={styles.warningBody}>{destinationsError}</Text>
                <Pressable onPress={() => void retryLoadDestinations()} style={styles.inlineAction}>
                  <Text style={styles.inlineActionText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!filteredDestinations.length ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No destinations found</Text>
                <Text style={styles.emptyStateBody}>Try another destination name or keyword.</Text>
              </View>
            ) : null}

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
            {isLoadingPacks ? (
              <View style={styles.emptyStateCard}>
                <View style={styles.loadingStateRow}>
                  <ActivityIndicator color={colors.primaryStrong} size="small" />
                  <View style={styles.loadingStateCopy}>
                    <Text style={styles.emptyStateTitle}>Loading packs</Text>
                    <Text style={styles.emptyStateBody}>
                      Fetching the latest packs for {selectedDestination.name}.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {packsError ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Could not load packs</Text>
                <Text style={styles.warningBody}>{packsError}</Text>
                <Pressable onPress={() => void retryLoadPacks()} style={styles.inlineAction}>
                  <Text style={styles.inlineActionText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!isLoadingPacks && !selectedDestination.packs.length ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No packs available</Text>
                <Text style={styles.emptyStateBody}>This destination does not have any packs to show right now.</Text>
              </View>
            ) : null}

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

            {hasPackTopUpBalanceIssue && selectedPurchasePacks.length ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Low balance for this top-up</Text>
                <Text style={styles.warningBody}>
                  Add credit from Wallet before completing this pack purchase.
                </Text>
              </View>
            ) : null}
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

            <View style={styles.recipientCard}>
              <View style={styles.recipientHeader}>
                <Text style={styles.recipientTitle}>Assign while purchasing</Text>
              </View>
              <Text style={styles.recipientHelper}>
                Add one email to assign all selected packs immediately. Leave it blank to buy into inventory only.
              </Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={updatePurchaseRecipientEmail}
                placeholder="Receiver email (optional)"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={purchaseRecipient.email}
              />
            </View>

            {purchaseSubmitError ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningBody}>{purchaseSubmitError}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        footer={
          <>
            <View style={styles.stickySummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>eSIM quantity</Text>
                  <Text style={styles.summaryValue}>{esimQuantity || '--'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unit price</Text>
                  <Text style={styles.summaryValue}>$1.00</Text>
                </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Purchase total</Text>
                <Text style={styles.summaryValue}>${esimTotalCost.toFixed(2)}</Text>
              </View>
              <Text style={styles.balanceHint}>Wallet balance ${effectiveWalletBalanceUsd.toFixed(2)}</Text>
            </View>
            <PrimaryButton
              disabled={hasEsimBalanceIssue || isSubmittingEsimPurchase}
              label={isSubmittingEsimPurchase ? 'Purchasing...' : 'Purchase eSIM'}
              onPress={buyEsims}
            />
            {hasEsimBalanceIssue ? (
              <PrimaryButton label="Go to Wallet" onPress={() => navigation.navigate('Wallet')} variant="secondary" />
            ) : null}
          </>
        }
        onClose={() => setShowEsimSheet(false)}
        subtitle="Buy bulk eSIM inventory with quantity only."
        title="Buy eSIM"
        visible={showEsimSheet}
      >
        <View style={styles.sheetContent}>
          <View style={styles.esimInputCard}>
            <Text style={styles.esimInputLabel}>Quantity</Text>
            <Text style={styles.esimInputHelp}>
              Enter the number of eSIMs you want to add to bulk inventory.
            </Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => {
                const digitsOnly = value.replace(/[^0-9]/g, '');
                setEsimQuantityInput(digitsOnly);
              }}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textSoft}
              style={styles.esimQuantityInput}
              value={esimQuantityInput}
            />
          </View>

          {hasEsimBalanceIssue ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Low balance for eSIM purchase</Text>
              <Text style={styles.warningBody}>Add more wallet credit before buying this eSIM quantity.</Text>
            </View>
          ) : null}

          {esimSubmitError ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningBody}>{esimSubmitError}</Text>
            </View>
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
  emptyStateCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 6,
  },
  loadingStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingStateCopy: {
    flex: 1,
    gap: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterRail: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.heading,
    textTransform: 'capitalize',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primaryStrong,
  },
  loadingPanel: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  logCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 4,
  },
  logTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
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
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.heading,
    textTransform: 'capitalize',
  },
  allocatedChip: {
    backgroundColor: colors.primarySoft,
  },
  allocatedChipText: {
    color: colors.primaryStrong,
  },
  availableChip: {
    backgroundColor: colors.surfaceSoft,
  },
  availableChipText: {
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
  esimInputCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  esimInputLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  esimInputHelp: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  esimQuantityInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
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
  stickySummaryCard: {
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
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
  recipientHelper: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
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
