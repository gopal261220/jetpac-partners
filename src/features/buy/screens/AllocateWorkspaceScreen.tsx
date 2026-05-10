import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '../../../components/BottomSheetModal';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AppTabScreenProps, AllocateWorkspaceScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { fetchWalletScreenData } from '../../wallet/api/wallet';
import { assignPackOrders } from '../api/assign';
import { fetchPackInventory, type PackInventoryItem, type PackInventoryStatusFilter } from '../api/packInventory';
import { fetchAllPacks, type CatalogPackOption } from '../api/packs';
import type {
  AllocationPreview,
  AllocationRecipientDraft,
  AllocationResult,
  InventoryStatus,
  RecipientDraft,
  RequestedPack,
} from '../types';

type WorkspaceProps = AllocateWorkspaceScreenProps & {
  navigation: AllocateWorkspaceScreenProps['navigation'] & AppTabScreenProps<'Buy'>['navigation'];
};

type WorkspaceView = 'allocate' | 'management';

type UserRecipientDraft = AllocationRecipientDraft & {
  isExpanded: boolean;
};

type ManagementDraft = {
  item: PackInventoryItem;
  email: string;
  phone: string;
  quantity: number;
};

const assignmentFilters: PackInventoryStatusFilter[] = ['all', 'allocated', 'unallocated'];

const emptyRecipient: RecipientDraft = {
  email: '',
  phone: '',
};

function createUserRecipient(seed = Date.now()) {
  return {
    id: `recipient-${seed}`,
    email: '',
    phone: '',
    requestedPacks: [],
    isExpanded: true,
  };
}

function getResultCopy(result: AllocationResult) {
  if (result.failedCount) {
    return {
      title: 'Allocation completed with follow-up',
      body: `${result.failedCount} user flow${result.failedCount === 1 ? '' : 's'} need retry from management.`,
    };
  }

  if (result.pendingCount) {
    return {
      title: 'Allocation queued',
      body: `${result.pendingCount} user flow${result.pendingCount === 1 ? '' : 's'} are pending confirmation.`,
    };
  }

  return {
    title: 'Packs allocated',
    body: 'Inventory was used first and wallet covered only the shortfall.',
  };
}

function getStatusTone(status: InventoryStatus | PackInventoryItem['status']) {
  if (status === 'assigned' || status === 'allocated') {
    return { backgroundColor: colors.primarySoft, color: colors.primaryStrong };
  }

  if (status === 'pending' || status === 'unassigned' || status === 'unallocated') {
    return { backgroundColor: colors.surfaceSoft, color: colors.primaryStrong };
  }

  return { backgroundColor: '#F7DEDA', color: colors.danger };
}

function getManagementActionLabel(status: InventoryStatus | PackInventoryItem['status']) {
  if (status === 'unassigned' || status === 'unallocated') {
    return 'Assign';
  }

  if (status === 'assigned' || status === 'allocated') {
    return 'Reassign';
  }

  return 'Retry';
}

function getManagementStatusLabel(status: InventoryStatus | PackInventoryItem['status']) {
  if (status === 'allocated' || status === 'assigned') {
    return 'Assigned';
  }

  if (status === 'unallocated' || status === 'unassigned') {
    return 'Unallocated';
  }

  if (status === 'pending') {
    return 'Pending';
  }

  return 'Failed';
}

function recipientHasIdentity(recipient: RecipientDraft) {
  return Boolean(recipient.email.trim() || recipient.phone.trim());
}

function buildLiveAllocationPreview(
  recipients: AllocationRecipientDraft[],
  inventoryItems: PackInventoryItem[],
  walletBalanceUsd: number
): AllocationPreview | null {
  const grouped = new Map<
    string,
    {
      key: string;
      destinationName: string;
      destinationFlag: string;
      packName: string;
      quantity: number;
      fromStockQuantity: number;
      purchaseQuantity: number;
      unitPriceUsd: number;
      purchaseCostUsd: number;
    }
  >();

  recipients.forEach((recipient) => {
    recipient.requestedPacks.forEach((pack) => {
      if (pack.quantity < 1) {
        return;
      }

      const key = `${pack.destinationId}:${pack.packId}`;
      const current = grouped.get(key);

      if (current) {
        current.quantity += pack.quantity;
        return;
      }

      grouped.set(key, {
        key,
        destinationName: pack.destinationName,
        destinationFlag: pack.destinationFlag,
        packName: pack.packName,
        quantity: pack.quantity,
        fromStockQuantity: 0,
        purchaseQuantity: 0,
        unitPriceUsd: pack.priceUsd,
        purchaseCostUsd: 0,
      });
    });
  });

  const lines = Array.from(grouped.values());

  if (!lines.length) {
    return null;
  }

  lines.forEach((line) => {
    const availableQuantity = inventoryItems.filter(
      (item) => item.status === 'unallocated' && `${item.destinationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${item.catalogId}` === line.key
    ).length;

    line.fromStockQuantity = Math.min(availableQuantity, line.quantity);
    line.purchaseQuantity = Math.max(0, line.quantity - line.fromStockQuantity);
    line.purchaseCostUsd = line.purchaseQuantity * line.unitPriceUsd;
  });

  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const stockUnits = lines.reduce((sum, line) => sum + line.fromStockQuantity, 0);
  const purchaseUnits = lines.reduce((sum, line) => sum + line.purchaseQuantity, 0);
  const walletDeductionUsd = lines.reduce((sum, line) => sum + line.purchaseCostUsd, 0);

  return {
    lines,
    totalUnits,
    stockUnits,
    purchaseUnits,
    walletDeductionUsd,
    walletBalanceBeforeUsd: walletBalanceUsd,
    walletBalanceAfterUsd: walletBalanceUsd - walletDeductionUsd,
    hasInsufficientBalance: walletBalanceUsd - walletDeductionUsd < 0,
  };
}

export function AllocateWorkspaceScreen({ navigation }: WorkspaceProps) {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('allocate');
  const [userRecipients, setUserRecipients] = useState<UserRecipientDraft[]>([createUserRecipient()]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerRecipientId, setPickerRecipientId] = useState<string | null>(null);
  const [isInventorySectionOpen, setIsInventorySectionOpen] = useState(true);
  const [isCatalogSectionOpen, setIsCatalogSectionOpen] = useState(false);
  const [catalogPackOptions, setCatalogPackOptions] = useState<CatalogPackOption[]>([]);
  const [isLoadingCatalogPacks, setIsLoadingCatalogPacks] = useState(false);
  const [catalogPackError, setCatalogPackError] = useState('');
  const [resultState, setResultState] = useState<AllocationResult | null>(null);
  const [allocationSubmitError, setAllocationSubmitError] = useState('');
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);
  const [assignmentQuery, setAssignmentQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<PackInventoryStatusFilter>('all');
  const [managementItems, setManagementItems] = useState<PackInventoryItem[]>([]);
  const [isLoadingManagement, setIsLoadingManagement] = useState(false);
  const [managementListError, setManagementListError] = useState('');
  const [managementDraft, setManagementDraft] = useState<ManagementDraft | null>(null);
  const [managementSubmitError, setManagementSubmitError] = useState('');
  const [isSubmittingManagement, setIsSubmittingManagement] = useState(false);
  const [walletBalanceUsd, setWalletBalanceUsd] = useState(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const deferredPickerQuery = useDeferredValue(pickerQuery.trim().toLowerCase());
  const deferredAssignmentQuery = useDeferredValue(assignmentQuery.trim().toLowerCase());

  const refreshWalletBalance = useCallback(async () => {
    setIsLoadingWallet(true);

    try {
      const response = await fetchWalletScreenData(1);
      setWalletBalanceUsd(response.wallet.availableBalance);
    } catch {
      // Keep the last known balance on screen if the refresh fails.
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  const refreshManagementItems = useCallback(async () => {
    setIsLoadingManagement(true);
    setManagementListError('');

    try {
      const nextItems = await fetchPackInventory(assignmentFilter);
      setManagementItems(nextItems);
    } catch (error) {
      setManagementListError(error instanceof Error ? error.message : 'Could not load pack assignments.');
    } finally {
      setIsLoadingManagement(false);
    }
  }, [assignmentFilter]);

  useEffect(() => {
    if (workspaceView !== 'management') {
      return;
    }

    void refreshManagementItems();
  }, [refreshManagementItems, workspaceView]);

  useFocusEffect(
    useCallback(() => {
      void refreshWalletBalance();

      if (workspaceView !== 'management') {
        return;
      }

      void refreshManagementItems();
    }, [refreshManagementItems, refreshWalletBalance, workspaceView])
  );

  useEffect(() => {
    if (!pickerRecipientId) {
      return;
    }

    if (!managementItems.length) {
      void fetchPackInventory('unallocated')
        .then(setManagementItems)
        .catch(() => undefined);
    }

    let isCancelled = false;

    async function loadCatalogPacks() {
      setIsLoadingCatalogPacks(true);
      setCatalogPackError('');

      try {
        const nextPacks = await fetchAllPacks(30);

        if (!isCancelled) {
          setCatalogPackOptions(nextPacks);
        }
      } catch (error) {
        if (!isCancelled) {
          setCatalogPackError(error instanceof Error ? error.message : 'Could not load packs.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCatalogPacks(false);
        }
      }
    }

    void loadCatalogPacks();

    return () => {
      isCancelled = true;
    };
  }, [pickerRecipientId]);

  const inventoryPickerPacks = useMemo(() => {
    const grouped = new Map<string, CatalogPackOption & { availableQuantity: number }>();

    managementItems
      .filter((item) => item.status === 'unallocated')
      .forEach((item) => {
        const key = `${item.destinationName}:${item.catalogId}`;
        const current = grouped.get(key);

        if (current) {
          current.availableQuantity += 1;
          return;
        }

        grouped.set(key, {
          key,
          destinationId: item.destinationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          destinationName: item.destinationName,
          destinationFlag: item.destinationFlag,
          packId: item.catalogId,
          packName: item.packName,
          dataAllowance: item.dataAllowance,
          validity: item.validity,
          priceUsd: item.priceUsd,
          availableQuantity: 1,
        });
      });

    return Array.from(grouped.values()).filter((pack) => {
      const haystack = `${pack.destinationName} ${pack.packName} ${pack.dataAllowance} ${pack.validity}`.toLowerCase();
      return !deferredPickerQuery || haystack.includes(deferredPickerQuery);
    });
  }, [deferredPickerQuery, managementItems]);

  const filteredCatalogPacks = useMemo(() => {
    return catalogPackOptions.filter((pack) => {
      const haystack = `${pack.destinationName} ${pack.packName} ${pack.dataAllowance} ${pack.validity}`.toLowerCase();
      return !deferredPickerQuery || haystack.includes(deferredPickerQuery);
    });
  }, [catalogPackOptions, deferredPickerQuery]);

  const filteredAssignmentItems = useMemo(() => {
    return managementItems.filter((item) => {
      const haystack =
        `${item.receiverUserId ?? ''} ${item.destinationName} ${item.packName}`.toLowerCase();
      const matchesQuery = !deferredAssignmentQuery || haystack.includes(deferredAssignmentQuery);
      return matchesQuery;
    });
  }, [deferredAssignmentQuery, managementItems]);

  const userPreview = useMemo(
    () =>
      buildLiveAllocationPreview(
        userRecipients.map(({ isExpanded, ...recipient }) => recipient),
        managementItems,
        walletBalanceUsd
      ),
    [managementItems, userRecipients, walletBalanceUsd]
  );

  const userValidationErrors = useMemo(() => {
    const errors: string[] = [];
    let actionableRecipients = 0;

    userRecipients.forEach((recipient, index) => {
      const hasIdentity = recipientHasIdentity(recipient);
      const totalRequested = recipient.requestedPacks.reduce((sum, pack) => sum + pack.quantity, 0);

      if (totalRequested > 0 && !hasIdentity) {
        errors.push(`Recipient ${index + 1} needs an email or phone number.`);
      }

      if (hasIdentity && totalRequested === 0) {
        errors.push(`Recipient ${index + 1} needs at least one pack.`);
      }

      if (hasIdentity && totalRequested > 0) {
        actionableRecipients += 1;
      }
    });

    if (!actionableRecipients) {
      errors.push('Add at least one user with contact details and pack selection.');
    }

    if (userPreview?.hasInsufficientBalance) {
      errors.push('Wallet balance is too low for the purchase shortfall.');
    }

    return errors;
  }, [userPreview, userRecipients]);

  const managementAvailableQuantity = useMemo(() => {
    if (!managementDraft || managementDraft.item.status !== 'unallocated') {
      return 1;
    }

    return managementItems.filter(
      (item) =>
        item.status === 'unallocated' &&
        item.destinationName === managementDraft.item.destinationName &&
        item.catalogId === managementDraft.item.catalogId
    ).length;
  }, [managementDraft, managementItems]);

  const managementError = useMemo(() => {
    if (!managementDraft) {
      return '';
    }

    if (!recipientHasIdentity({ email: managementDraft.email, phone: managementDraft.phone })) {
      return 'Add at least an email or phone number.';
    }

    if (managementDraft.quantity < 1) {
      return 'Choose at least one pack.';
    }

    if (managementDraft.item.status !== 'unallocated' && managementDraft.quantity !== 1) {
      return 'Allocated packs can only be updated one at a time.';
    }

    if (managementDraft.quantity > managementAvailableQuantity) {
      return 'Quantity is higher than the available unallocated stock.';
    }

    return '';
  }, [managementAvailableQuantity, managementDraft]);

  function addUserRecipient() {
    setUserRecipients((current) => [...current, createUserRecipient(Date.now() + current.length)]);
  }

  function removeUserRecipient(recipientId: string) {
    setUserRecipients((current) =>
      current.length === 1 ? current : current.filter((recipient) => recipient.id !== recipientId)
    );
  }

  function updateUserRecipientField(recipientId: string, field: 'email' | 'phone', value: string) {
    setUserRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, [field]: value } : recipient
      )
    );
  }

  function toggleUserRecipientExpanded(recipientId: string) {
    setUserRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, isExpanded: !recipient.isExpanded } : recipient
      )
    );
  }

  function updateUserPackQuantity(recipientId: string, packKey: string, nextQuantity: number) {
    setUserRecipients((current) =>
      current.map((recipient) => {
        if (recipient.id !== recipientId) {
          return recipient;
        }

        const nextRequestedPacks = recipient.requestedPacks.reduce<RequestedPack[]>((accumulator, pack) => {
          if (`${pack.destinationId}:${pack.packId}` !== packKey) {
            accumulator.push(pack);
            return accumulator;
          }

          if (nextQuantity > 0) {
            accumulator.push({ ...pack, quantity: nextQuantity });
          }

          return accumulator;
        }, []);

        return { ...recipient, requestedPacks: nextRequestedPacks };
      })
    );
  }

  function addRequestedPackToRecipient(recipientId: string, pack: RequestedPack) {
    setUserRecipients((current) =>
      current.map((recipient) => {
        if (recipient.id !== recipientId) {
          return recipient;
        }

        const existingPack = recipient.requestedPacks.find(
          (item) => item.destinationId === pack.destinationId && item.packId === pack.packId
        );

        if (existingPack) {
          return {
            ...recipient,
            requestedPacks: recipient.requestedPacks.map((item) =>
              item.destinationId === pack.destinationId && item.packId === pack.packId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          };
        }

        return {
          ...recipient,
          requestedPacks: [...recipient.requestedPacks, { ...pack, quantity: 1 }],
        };
      })
    );

    setPickerRecipientId(null);
    setPickerQuery('');
  }

  async function submitUserAllocation() {
    if (userPreview?.hasInsufficientBalance) {
      return;
    }

    setIsSubmittingAllocation(true);
    setAllocationSubmitError('');

    const recipients = userRecipients.map(({ isExpanded, ...recipient }) => recipient);
    const requests = recipients.flatMap((recipient) => {
      const receiverUserId = recipient.email.trim() || recipient.phone.trim();

      if (!receiverUserId) {
        return [];
      }

      return recipient.requestedPacks.flatMap((pack) =>
        Array.from({ length: pack.quantity }, () => ({
          catalogId: pack.packId,
          receiverUserId,
        }))
      );
    });

    try {
      if (requests.length) {
        await assignPackOrders(requests);
      }
      const totalUnits = requests.length;
      const actionableRecipients = recipients.filter(
        (recipient) =>
          recipientHasIdentity(recipient) && recipient.requestedPacks.some((pack) => pack.quantity > 0)
      );
      const assignedCount = actionableRecipients.reduce((sum, recipient) => {
        if (recipient.email.trim()) {
          return sum + 1;
        }

        return sum;
      }, 0);
      const pendingCount = actionableRecipients.reduce((sum, recipient) => {
        if (!recipient.email.trim() && recipient.phone.trim()) {
          return sum + 1;
        }

        return sum;
      }, 0);

      const nextItems = await fetchPackInventory('all');
      setManagementItems(nextItems);
      await refreshWalletBalance();
      setResultState({
        preview:
          userPreview ?? {
            lines: [],
            totalUnits,
            stockUnits: totalUnits,
            purchaseUnits: 0,
            walletDeductionUsd: 0,
            walletBalanceBeforeUsd: walletBalanceUsd,
            walletBalanceAfterUsd: walletBalanceUsd,
            hasInsufficientBalance: false,
          },
        assignedCount,
        pendingCount,
        failedCount: 0,
        purchasedCount: userPreview?.purchaseUnits ?? 0,
        inventoryItems: [],
      });
      setUserRecipients([createUserRecipient()]);
    } catch (error) {
      setAllocationSubmitError(error instanceof Error ? error.message : 'Could not complete this allocation.');
    } finally {
      setIsSubmittingAllocation(false);
    }
  }

  function openManagementSheet(item: PackInventoryItem) {
    setManagementSubmitError('');
    setManagementDraft({
      item,
      email: item.receiverUserId ?? '',
      phone: '',
      quantity: 1,
    });
  }

  async function submitManagementAction() {
    if (!managementDraft || managementError) {
      return;
    }

    const { item } = managementDraft;
    const requestQuantity = item.status === 'unallocated' ? managementDraft.quantity : 1;

    setIsSubmittingManagement(true);
    setManagementSubmitError('');

    try {
      const catalogId = item.catalogId;
      const receiverUserId = managementDraft.email.trim() || managementDraft.phone.trim();

      if (catalogId && receiverUserId) {
        await assignPackOrders(
          Array.from({ length: requestQuantity }, () => ({
            catalogId,
            receiverUserId,
          }))
        );
      }

      await refreshManagementItems();
      await refreshWalletBalance();

      setManagementDraft(null);
      setResultState({
        preview: {
          lines: [],
          totalUnits: requestQuantity,
          stockUnits: requestQuantity,
          purchaseUnits: 0,
          walletDeductionUsd: 0,
          walletBalanceBeforeUsd: walletBalanceUsd,
          walletBalanceAfterUsd: walletBalanceUsd,
          hasInsufficientBalance: false,
        },
        assignedCount: 1,
        pendingCount: 0,
        failedCount: 0,
        purchasedCount: 0,
        inventoryItems: [],
      });
    } catch (error) {
      setManagementSubmitError(error instanceof Error ? error.message : 'Could not update this assignment.');
    } finally {
      setIsSubmittingManagement(false);
    }
  }

  return (
    <ScreenContainer
      subtitle="Allocate from inventory fast and manage assignment follow-up in the same workspace."
      title="Allocate"
    >
      <View style={styles.viewRail}>
        <Pressable
          onPress={() => setWorkspaceView('allocate')}
          style={[styles.viewChip, workspaceView === 'allocate' && styles.viewChipActive]}
        >
          <Text style={[styles.viewChipText, workspaceView === 'allocate' && styles.viewChipTextActive]}>
            Assign packs
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setWorkspaceView('management')}
          style={[styles.viewChip, workspaceView === 'management' && styles.viewChipActive]}
        >
          <Text
            style={[styles.viewChipText, workspaceView === 'management' && styles.viewChipTextActive]}
          >
            Assignment management
          </Text>
        </Pressable>
      </View>

      {workspaceView === 'allocate' ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <>
                <View style={styles.heroCard}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroTitle}>Assign many packs to many users</Text>
                    <Text style={styles.heroBody}>
                      Add users first, attach packs, and let the app use stock before wallet top-up.
                    </Text>
                  </View>
                  <PrimaryButton label="Add user" onPress={addUserRecipient} variant="secondary" />
                </View>

                {userRecipients.map((recipient, index) => (
                  <View key={recipient.id} style={styles.recipientCard}>
                    <View style={styles.recipientHeader}>
                      <Text style={styles.recipientTitle}>Recipient {index + 1}</Text>
                      <View style={styles.recipientActions}>
                        <Pressable onPress={() => toggleUserRecipientExpanded(recipient.id)}>
                          <Text style={styles.recipientActionText}>
                            {recipient.isExpanded ? 'Hide' : 'View'}
                          </Text>
                        </Pressable>
                        {userRecipients.length > 1 ? (
                          <Pressable onPress={() => removeUserRecipient(recipient.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>

                    {!recipient.isExpanded ? (
                      <Text style={styles.collapsedMeta}>
                        {recipient.email || recipient.phone || 'No contact details'} •{' '}
                        {recipient.requestedPacks.reduce((sum, pack) => sum + pack.quantity, 0)} pack
                        {recipient.requestedPacks.reduce((sum, pack) => sum + pack.quantity, 0) === 1 ? '' : 's'}
                      </Text>
                    ) : (
                      <>
                        <TextInput
                          autoCapitalize="none"
                          keyboardType="email-address"
                          onChangeText={(value) => updateUserRecipientField(recipient.id, 'email', value)}
                          placeholder="Email"
                          placeholderTextColor={colors.textSoft}
                          style={styles.input}
                          value={recipient.email}
                        />
                        <TextInput
                          keyboardType="phone-pad"
                          onChangeText={(value) => updateUserRecipientField(recipient.id, 'phone', value)}
                          placeholder="Phone"
                          placeholderTextColor={colors.textSoft}
                          style={styles.input}
                          value={recipient.phone}
                        />

                        <View style={styles.packList}>
                          {recipient.requestedPacks.map((pack) => {
                            const packKey = `${pack.destinationId}:${pack.packId}`;
                            const inventoryPack = inventoryPickerPacks.find((group) => group.key === packKey);
                            const available = inventoryPack?.availableQuantity ?? 0;
                            const shortage = Math.max(0, pack.quantity - available);

                            return (
                              <View key={packKey} style={styles.packRow}>
                                <View style={styles.packCopy}>
                                  <Text style={styles.packName}>
                                    {pack.destinationFlag} {pack.destinationName} • {pack.packName}
                                  </Text>
                                  <Text style={styles.packMeta}>
                                    {pack.dataAllowance} • {available} in stock
                                    {shortage ? ` • buy ${shortage}` : ''}
                                  </Text>
                                </View>
                                <View style={styles.stepper}>
                                  <Pressable
                                    onPress={() =>
                                      updateUserPackQuantity(recipient.id, packKey, Math.max(0, pack.quantity - 1))
                                    }
                                    style={styles.stepperButton}
                                  >
                                    <Ionicons color={colors.primaryStrong} name="remove" size={14} />
                                  </Pressable>
                                  <Text style={styles.stepperValue}>{pack.quantity}</Text>
                                  <Pressable
                                    onPress={() => updateUserPackQuantity(recipient.id, packKey, pack.quantity + 1)}
                                    style={styles.stepperButton}
                                  >
                                    <Ionicons color={colors.primaryStrong} name="add" size={14} />
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        <PrimaryButton
                          label="Add pack"
                          onPress={() => setPickerRecipientId(recipient.id)}
                          variant="secondary"
                        />
                      </>
                    )}
                  </View>
                ))}

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Using stock</Text>
                    <Text style={styles.summaryValue}>{userPreview?.stockUnits ?? 0} packs</Text>
                  </View>
                  {userPreview?.purchaseUnits ? (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Buying now</Text>
                        <Text style={styles.summaryValue}>{userPreview.purchaseUnits} packs</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Wallet impact</Text>
                        <Text style={styles.summaryValue}>
                          ${userPreview.walletDeductionUsd.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.balanceHint}>
                        {isLoadingWallet ? 'Refreshing wallet…' : `Balance $${walletBalanceUsd.toFixed(2)}`}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.balanceHint}>Selected packs are covered by inventory.</Text>
                  )}
                </View>

                {userPreview?.hasInsufficientBalance ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Wallet balance is too low</Text>
                    <Text style={styles.warningText}>
                      Add ${(userPreview.walletDeductionUsd - walletBalanceUsd).toFixed(2)} more to cover this allocation.
                    </Text>
                  </View>
                ) : null}

                {userValidationErrors.length ? (
                  <View style={styles.errorCard}>
                    {userValidationErrors.map((error) => (
                      <Text key={error} style={styles.errorText}>
                        {error}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {allocationSubmitError ? (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{allocationSubmitError}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={Boolean(userValidationErrors.length) || isSubmittingAllocation}
                  label={isSubmittingAllocation ? 'Allocating…' : 'Allocate all'}
                  onPress={submitUserAllocation}
                />
                {userPreview?.hasInsufficientBalance ? (
                  <PrimaryButton
                    label="Go to Wallet"
                    onPress={() => navigation.navigate('Wallet')}
                    variant="secondary"
                  />
                ) : null}
            </>
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Assignment management</Text>
              <Text style={styles.heroBody}>
                Search assignments, filter by status, and assign or reassign inventory from one place.
              </Text>
            </View>
          </View>

          <View style={styles.searchField}>
            <Ionicons color={colors.textSoft} name="search-outline" size={18} />
            <TextInput
              onChangeText={setAssignmentQuery}
              placeholder="Search by email or phone"
              placeholderTextColor={colors.textSoft}
              style={styles.searchInput}
              value={assignmentQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRail}>
              {assignmentFilters.map((filter) => {
                const isActive = filter === assignmentFilter;

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setAssignmentFilter(filter)}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter === 'all' ? 'All' : filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.section}>
            {isLoadingManagement ? (
              <View style={styles.loadingPanel}>
                <ActivityIndicator color={colors.primaryStrong} size="small" />
                <Text style={styles.loadingText}>Loading pack inventory</Text>
              </View>
            ) : null}

            {managementListError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{managementListError}</Text>
              </View>
            ) : null}

            {filteredAssignmentItems.map((item) => {
              const tone = getStatusTone(item.status);
              const availableGroupQuantity =
                item.status === 'unallocated'
                  ? managementItems.filter(
                      (managementItem) =>
                        managementItem.status === 'unallocated' &&
                        managementItem.destinationName === item.destinationName &&
                        managementItem.catalogId === item.catalogId
                    ).length
                  : 1;

              return (
                <View key={item.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentTopRow}>
                    <View style={styles.assignmentCopy}>
                      <Text style={styles.assignmentTitle}>
                        {item.destinationFlag} {item.destinationName} • {item.packName}
                      </Text>
                      <Text style={styles.assignmentMeta}>
                        {item.receiverUserId ?? 'No user assigned'}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: tone.backgroundColor }]}>
                      <Text style={[styles.statusChipText, { color: tone.color }]}>
                        {getManagementStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.assignmentTime}>
                    Created {new Date(item.createdAt).toLocaleString()}
                    {item.updatedAt ? ` • Updated ${new Date(item.updatedAt).toLocaleString()}` : ''}
                  </Text>
                  {item.status === 'unallocated' ? (
                    <>
                      <Text style={styles.assignmentQuantityHint}>{availableGroupQuantity} ready in this pack group</Text>
                      <Pressable onPress={() => openManagementSheet(item)} style={styles.inlineAction}>
                        <Text style={styles.inlineActionText}>{getManagementActionLabel(item.status)}</Text>
                      </Pressable>
                    </>
                  ) : item.status === 'allocated' ? (
                    <Pressable onPress={() => openManagementSheet(item)} style={styles.inlineAction}>
                      <Text style={styles.inlineActionText}>{getManagementActionLabel(item.status)}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {!isLoadingManagement && !managementListError && !filteredAssignmentItems.length ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No packs found</Text>
                <Text style={styles.emptyBody}>Try another filter or search by receiver ID.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <BottomSheetModal
        onClose={() => {
          setPickerRecipientId(null);
          setPickerQuery('');
          setIsInventorySectionOpen(true);
          setIsCatalogSectionOpen(false);
        }}
        subtitle="Choose from live inventory first, then browse the full pack catalog."
        title="Add pack"
        visible={Boolean(pickerRecipientId)}
      >
        <View style={styles.sheetContent}>
          <View style={styles.searchField}>
            <Ionicons color={colors.textSoft} name="search-outline" size={18} />
            <TextInput
              onChangeText={setPickerQuery}
              placeholder="Search destination or pack"
              placeholderTextColor={colors.textSoft}
              style={styles.searchInput}
              value={pickerQuery}
            />
          </View>

          <View style={styles.sheetSection}>
            <Pressable
              onPress={() => setIsInventorySectionOpen((current) => !current)}
              style={styles.sheetSectionHeader}
            >
              <Text style={styles.sheetSectionTitle}>Inventory packs</Text>
              <Ionicons
                color={colors.textSoft}
                name={isInventorySectionOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
              />
            </Pressable>

            {isInventorySectionOpen ? (
              inventoryPickerPacks.length ? (
                inventoryPickerPacks.map((pack) => (
                  <Pressable
                    key={pack.key}
                    onPress={() =>
                      pickerRecipientId
                        ? addRequestedPackToRecipient(pickerRecipientId, {
                            destinationId: pack.destinationId,
                            destinationName: pack.destinationName,
                            destinationFlag: pack.destinationFlag,
                            packId: pack.packId,
                            packName: pack.packName,
                            dataAllowance: pack.dataAllowance,
                            validity: pack.validity,
                            priceUsd: pack.priceUsd,
                            quantity: 1,
                          })
                        : undefined
                    }
                    style={({ pressed }) => [styles.sheetOptionCard, pressed && styles.cardPressed]}
                  >
                    <View style={styles.sheetOptionCopy}>
                      <Text style={styles.sheetOptionTitle}>
                        {pack.destinationFlag} {pack.destinationName} • {pack.packName}
                      </Text>
                      <Text style={styles.sheetOptionMeta}>
                        {pack.dataAllowance} • {pack.validity} • ${pack.priceUsd.toFixed(2)} • {pack.availableQuantity} in stock
                      </Text>
                    </View>
                    <Ionicons color={colors.primaryStrong} name="add-circle-outline" size={18} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No inventory packs</Text>
                  <Text style={styles.emptyBody}>Unallocated packs will appear here first.</Text>
                </View>
              )
            ) : null}
          </View>

          <View style={styles.sheetSection}>
            <Pressable
              onPress={() => setIsCatalogSectionOpen((current) => !current)}
              style={styles.sheetSectionHeader}
            >
              <Text style={styles.sheetSectionTitle}>All packs</Text>
              <Ionicons
                color={colors.textSoft}
                name={isCatalogSectionOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
              />
            </Pressable>

            {isCatalogSectionOpen ? (
              isLoadingCatalogPacks ? (
                <View style={styles.loadingPanel}>
                  <ActivityIndicator color={colors.primaryStrong} size="small" />
                  <Text style={styles.loadingText}>Loading pack catalog</Text>
                </View>
              ) : catalogPackError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{catalogPackError}</Text>
                </View>
              ) : filteredCatalogPacks.length ? (
                filteredCatalogPacks.map((pack) => (
                  <Pressable
                    key={pack.key}
                    onPress={() =>
                      pickerRecipientId
                        ? addRequestedPackToRecipient(pickerRecipientId, {
                            destinationId: pack.destinationId,
                            destinationName: pack.destinationName,
                            destinationFlag: pack.destinationFlag,
                            packId: pack.packId,
                            packName: pack.packName,
                            dataAllowance: pack.dataAllowance,
                            validity: pack.validity,
                            priceUsd: pack.priceUsd,
                            quantity: 1,
                          })
                        : undefined
                    }
                    style={({ pressed }) => [styles.sheetOptionCard, pressed && styles.cardPressed]}
                  >
                    <View style={styles.sheetOptionCopy}>
                      <Text style={styles.sheetOptionTitle}>
                        {pack.destinationFlag} {pack.destinationName} • {pack.packName}
                      </Text>
                      <Text style={styles.sheetOptionMeta}>
                        {pack.dataAllowance} • {pack.validity} • ${pack.priceUsd.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons color={colors.primaryStrong} name="add-circle-outline" size={18} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No packs found</Text>
                  <Text style={styles.emptyBody}>Try another search term.</Text>
                </View>
              )
            ) : null}
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => {
          setManagementDraft(null);
          setManagementSubmitError('');
        }}
        subtitle={
          managementDraft
            ? `${managementDraft.item.destinationFlag} ${managementDraft.item.destinationName} • ${managementDraft.item.packName}`
            : undefined
        }
        title={managementDraft ? getManagementActionLabel(managementDraft.item.status) : 'Manage assignment'}
        visible={Boolean(managementDraft)}
      >
        {managementDraft ? (
          <View style={styles.sheetContent}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current status</Text>
                <Text style={styles.summaryValue}>{managementDraft.item.status}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Available quantity</Text>
                <Text style={styles.summaryValue}>{managementAvailableQuantity}</Text>
              </View>
            </View>

            <TextInput
              autoCapitalize="none"
              editable={managementDraft.item.status !== 'allocated'}
              keyboardType="email-address"
              onChangeText={(value) => setManagementDraft((current) => (current ? { ...current, email: value } : current))}
              placeholder="Email"
              placeholderTextColor={colors.textSoft}
              style={[styles.input, managementDraft.item.status === 'allocated' && styles.inputDisabled]}
              value={managementDraft.email}
            />
            {managementDraft.item.status === 'allocated' ? (
              <Text style={styles.fieldHint}>Assigned email is locked for reassign flow.</Text>
            ) : null}
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) => setManagementDraft((current) => (current ? { ...current, phone: value } : current))}
              placeholder="Phone"
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              value={managementDraft.phone}
            />

            <View style={styles.packRow}>
              <View style={styles.packCopy}>
                <Text style={styles.packName}>Quantity</Text>
                <Text style={styles.packMeta}>
                  {managementDraft.item.dataAllowance} • {managementDraft.item.validity}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() =>
                    setManagementDraft((current) =>
                      current ? { ...current, quantity: Math.max(1, current.quantity - 1) } : current
                    )
                  }
                  style={styles.stepperButton}
                >
                  <Ionicons color={colors.primaryStrong} name="remove" size={14} />
                </Pressable>
                <Text style={styles.stepperValue}>{managementDraft.quantity}</Text>
                <Pressable
                  onPress={() =>
                    setManagementDraft((current) =>
                      current
                        ? {
                            ...current,
                            quantity: Math.min(
                              current.item.status === 'unallocated' ? managementAvailableQuantity : 1,
                              current.quantity + 1
                            ),
                          }
                        : current
                    )
                  }
                  style={[
                    styles.stepperButton,
                    managementDraft.item.status !== 'unallocated' && styles.stepperButtonDisabled,
                  ]}
                >
                  <Ionicons
                    color={managementDraft.item.status !== 'unallocated' ? colors.textSoft : colors.primaryStrong}
                    name="add"
                    size={14}
                  />
                </Pressable>
              </View>
            </View>

            {managementError || managementSubmitError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{managementError || managementSubmitError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={Boolean(managementError) || isSubmittingManagement}
              label={managementDraft.item.status === 'unallocated' ? 'Assign packs' : 'Save update'}
              onPress={submitManagementAction}
            />
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setResultState(null)}
        subtitle="Allocation state updated."
        title="Done"
        visible={Boolean(resultState)}
      >
        {resultState ? (
          <View style={styles.sheetContent}>
            <View style={styles.resultCard}>
              <View style={styles.resultIconOrb}>
                <Ionicons color={colors.surface} name="checkmark" size={20} />
              </View>
              <Text style={styles.resultTitle}>{getResultCopy(resultState).title}</Text>
              <Text style={styles.resultBody}>{getResultCopy(resultState).body}</Text>
              <Text style={styles.resultAmount}>{resultState.preview.totalUnits} packs handled</Text>
            </View>
            <PrimaryButton label="Done" onPress={() => setResultState(null)} />
          </View>
        ) : null}
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  viewRail: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  viewChip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewChipActive: {
    backgroundColor: colors.surface,
  },
  viewChipText: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.textMuted,
  },
  viewChipTextActive: {
    color: colors.primaryStrong,
  },
  modeRail: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  modeChip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: colors.surface,
  },
  modeChipText: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modeChipTextActive: {
    color: colors.primaryStrong,
  },
  content: {
    gap: 14,
    paddingBottom: 20,
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
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  recipientCard: {
    borderRadius: 26,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recipientTitle: {
    fontSize: 16,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  recipientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recipientActionText: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.primary,
  },
  removeText: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
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
  inputDisabled: {
    opacity: 0.72,
  },
  fieldHint: {
    marginTop: -6,
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textSoft,
  },
  packList: {
    gap: 10,
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
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  packMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontFamily: typography.heading,
    fontWeight: '700',
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
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  balanceHint: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.primaryStrong,
  },
  errorCard: {
    borderRadius: 20,
    backgroundColor: '#FDF0EE',
    padding: 14,
    gap: 6,
  },
  warningCard: {
    borderRadius: 20,
    backgroundColor: '#FFF5DB',
    padding: 14,
    gap: 6,
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: '#9A6700',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: '#9A6700',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.danger,
  },
  loadingPanel: {
    borderRadius: 20,
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
  stockCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  stockTopRow: {
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
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  stockMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  stockCountPill: {
    minWidth: 36,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  stockCountText: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  stockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockHelperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  inlinePrimaryAction: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlinePrimaryActionText: {
    fontSize: 14,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.surface,
  },
  filterRail: {
    flexDirection: 'row',
    gap: 8,
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
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: colors.primaryStrong,
  },
  section: {
    gap: 12,
  },
  assignmentCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  assignmentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  assignmentCopy: {
    flex: 1,
    gap: 4,
  },
  assignmentTitle: {
    fontSize: 15,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  assignmentMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  assignmentTime: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.body,
    color: colors.textSoft,
  },
  assignmentQuantityHint: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.primaryStrong,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
  },
  inlineActionText: {
    fontSize: 12,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: typography.heading,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyState: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  sheetContent: {
    gap: 14,
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sheetOptionCard: {
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetOptionCopy: {
    flex: 1,
    gap: 4,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.text,
  },
  sheetOptionMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  sheetRecipientCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 10,
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
    backgroundColor: colors.primary,
  },
  resultTitle: {
    fontSize: 19,
    fontFamily: typography.heading,
    fontWeight: '700',
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
  resultAmount: {
    fontSize: 14,
    fontFamily: typography.heading,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  cardPressed: {
    opacity: 0.92,
  },
});
