import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetModal } from '../../../components/BottomSheetModal';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AppTabScreenProps, AllocateWorkspaceScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { useBuyFlow } from '../context/BuyFlowContext';
import { destinationCatalog } from '../data/catalog';
import type {
  AllocationMode,
  AllocationRecipientDraft,
  AllocationResult,
  InventoryItem,
  InventoryStatus,
  RecipientDraft,
  RequestedPack,
  StockGroup,
} from '../types';

type WorkspaceProps = AllocateWorkspaceScreenProps & {
  navigation: AllocateWorkspaceScreenProps['navigation'] & AppTabScreenProps<'Buy'>['navigation'];
};

type WorkspaceView = 'allocate' | 'management';
type AssignmentFilter = 'all' | InventoryStatus;

type UserRecipientDraft = AllocationRecipientDraft & {
  isExpanded: boolean;
};

type PackRecipientDraft = {
  id: string;
  email: string;
  phone: string;
  quantity: number;
};

type ManagementDraft = {
  item: InventoryItem;
  email: string;
  phone: string;
  quantity: number;
};

const allocationModes: Array<{ key: AllocationMode; label: string }> = [
  { key: 'user', label: 'By user' },
  { key: 'pack', label: 'By pack' },
];

const assignmentFilters: AssignmentFilter[] = ['all', 'unassigned', 'assigned', 'pending', 'failed'];

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

function createPackRecipient(seed = Date.now()) {
  return {
    id: `pack-recipient-${seed}`,
    email: '',
    phone: '',
    quantity: 1,
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

function getStatusTone(status: InventoryStatus) {
  if (status === 'assigned') {
    return { backgroundColor: colors.primarySoft, color: colors.primaryStrong };
  }

  if (status === 'pending' || status === 'unassigned') {
    return { backgroundColor: colors.surfaceSoft, color: colors.primaryStrong };
  }

  return { backgroundColor: '#F7DEDA', color: colors.danger };
}

function getManagementActionLabel(status: InventoryStatus) {
  if (status === 'unassigned') {
    return 'Assign';
  }

  if (status === 'assigned') {
    return 'Reassign';
  }

  return 'Retry';
}

function recipientHasIdentity(recipient: RecipientDraft) {
  return Boolean(recipient.email.trim() || recipient.phone.trim());
}

function flattenCatalogPacks() {
  return destinationCatalog.flatMap((destination) =>
    destination.packs.map((pack) => ({
      key: `${destination.id}:${pack.id}`,
      destinationId: destination.id,
      destinationName: destination.name,
      destinationFlag: destination.flag,
      packId: pack.id,
      packName: pack.name,
      dataAllowance: pack.dataAllowance,
      validity: pack.validity,
      priceUsd: pack.priceUsd,
      region: destination.region,
      category: destination.category,
    }))
  );
}

const catalogPacks = flattenCatalogPacks();

export function AllocateWorkspaceScreen({ navigation }: WorkspaceProps) {
  const {
    assignInventoryItems,
    buildAllocationPreview,
    inventoryItems,
    stockGroups,
    submitAllocationPlan,
    walletBalanceUsd,
  } = useBuyFlow();

  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('allocate');
  const [mode, setMode] = useState<AllocationMode>('user');
  const [userRecipients, setUserRecipients] = useState<UserRecipientDraft[]>([createUserRecipient()]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerRecipientId, setPickerRecipientId] = useState<string | null>(null);
  const [packSearch, setPackSearch] = useState('');
  const [selectedPackGroup, setSelectedPackGroup] = useState<StockGroup | null>(null);
  const [packRecipients, setPackRecipients] = useState<PackRecipientDraft[]>([createPackRecipient()]);
  const [resultState, setResultState] = useState<AllocationResult | null>(null);
  const [assignmentQuery, setAssignmentQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [managementDraft, setManagementDraft] = useState<ManagementDraft | null>(null);

  const deferredPickerQuery = useDeferredValue(pickerQuery.trim().toLowerCase());
  const deferredPackSearch = useDeferredValue(packSearch.trim().toLowerCase());
  const deferredAssignmentQuery = useDeferredValue(assignmentQuery.trim().toLowerCase());

  const filteredPickerPacks = useMemo(() => {
    return catalogPacks.filter((pack) => {
      const haystack = `${pack.destinationName} ${pack.packName} ${pack.region} ${pack.category}`.toLowerCase();
      return !deferredPickerQuery || haystack.includes(deferredPickerQuery);
    });
  }, [deferredPickerQuery]);

  const filteredStockGroups = useMemo(() => {
    return stockGroups.filter((group) => {
      const haystack = `${group.destinationName} ${group.packName} ${group.dataAllowance} ${group.validity}`.toLowerCase();
      return !deferredPackSearch || haystack.includes(deferredPackSearch);
    });
  }, [deferredPackSearch, stockGroups]);

  const filteredAssignmentItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesFilter = assignmentFilter === 'all' ? true : item.status === assignmentFilter;
      const haystack =
        `${item.email ?? ''} ${item.phone ?? ''} ${item.destinationName} ${item.packName}`.toLowerCase();
      const matchesQuery = !deferredAssignmentQuery || haystack.includes(deferredAssignmentQuery);
      return matchesFilter && matchesQuery;
    });
  }, [assignmentFilter, deferredAssignmentQuery, inventoryItems]);

  const userPreview = useMemo(
    () => buildAllocationPreview(userRecipients.map(({ isExpanded, ...recipient }) => recipient)),
    [buildAllocationPreview, userRecipients]
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

  const selectedPackPreview = useMemo(() => {
    if (!selectedPackGroup) {
      return null;
    }

    const recipients: AllocationRecipientDraft[] = packRecipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      phone: recipient.phone,
      requestedPacks: recipient.quantity
        ? [
            {
              destinationId: selectedPackGroup.destinationId,
              destinationName: selectedPackGroup.destinationName,
              destinationFlag: selectedPackGroup.destinationFlag,
              packId: selectedPackGroup.packId,
              packName: selectedPackGroup.packName,
              dataAllowance: selectedPackGroup.dataAllowance,
              validity: selectedPackGroup.validity,
              priceUsd: selectedPackGroup.priceUsd,
              quantity: recipient.quantity,
            },
          ]
        : [],
    }));

    return buildAllocationPreview(recipients);
  }, [buildAllocationPreview, packRecipients, selectedPackGroup]);

  const packValidationErrors = useMemo(() => {
    if (!selectedPackGroup) {
      return [];
    }

    const errors: string[] = [];
    let activeRecipients = 0;

    packRecipients.forEach((recipient, index) => {
      const hasIdentity = recipientHasIdentity(recipient);

      if (recipient.quantity > 0 && !hasIdentity) {
        errors.push(`Recipient ${index + 1} needs an email or phone number.`);
      }

      if (hasIdentity && recipient.quantity < 1) {
        errors.push(`Recipient ${index + 1} needs at least one pack.`);
      }

      if (hasIdentity && recipient.quantity > 0) {
        activeRecipients += 1;
      }
    });

    if (!activeRecipients) {
      errors.push('Add at least one recipient for this pack.');
    }

    if (selectedPackPreview?.hasInsufficientBalance) {
      errors.push('Wallet balance is too low for the requested top-up quantity.');
    }

    return errors;
  }, [packRecipients, selectedPackGroup, selectedPackPreview]);

  const managementAvailableQuantity = useMemo(() => {
    if (!managementDraft || managementDraft.item.status !== 'unassigned') {
      return 1;
    }

    return inventoryItems.filter(
      (item) =>
        item.status === 'unassigned' &&
        item.destinationId === managementDraft.item.destinationId &&
        item.packId === managementDraft.item.packId
    ).length;
  }, [inventoryItems, managementDraft]);

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

    if (managementDraft.item.status !== 'unassigned' && managementDraft.quantity !== 1) {
      return 'Assigned, pending, and failed items can only be updated one at a time.';
    }

    if (managementDraft.quantity > managementAvailableQuantity) {
      return 'Quantity is higher than the available unassigned stock.';
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

  function submitUserAllocation() {
    const result = submitAllocationPlan(userRecipients.map(({ isExpanded, ...recipient }) => recipient));

    if (!result) {
      return;
    }

    setResultState(result);
    setUserRecipients([createUserRecipient()]);
  }

  function openPackAllocation(group: StockGroup) {
    setSelectedPackGroup(group);
    setPackRecipients([createPackRecipient()]);
  }

  function updatePackRecipientField(recipientId: string, field: 'email' | 'phone', value: string) {
    setPackRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, [field]: value } : recipient
      )
    );
  }

  function updatePackRecipientQuantity(recipientId: string, nextQuantity: number) {
    setPackRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, quantity: Math.max(0, nextQuantity) } : recipient
      )
    );
  }

  function addPackRecipient() {
    setPackRecipients((current) => [...current, createPackRecipient(Date.now() + current.length)]);
  }

  function removePackRecipient(recipientId: string) {
    setPackRecipients((current) =>
      current.length === 1 ? current : current.filter((recipient) => recipient.id !== recipientId)
    );
  }

  function submitPackAllocation() {
    if (!selectedPackGroup) {
      return;
    }

    const recipients: AllocationRecipientDraft[] = packRecipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      phone: recipient.phone,
      requestedPacks: recipient.quantity
        ? [
            {
              destinationId: selectedPackGroup.destinationId,
              destinationName: selectedPackGroup.destinationName,
              destinationFlag: selectedPackGroup.destinationFlag,
              packId: selectedPackGroup.packId,
              packName: selectedPackGroup.packName,
              dataAllowance: selectedPackGroup.dataAllowance,
              validity: selectedPackGroup.validity,
              priceUsd: selectedPackGroup.priceUsd,
              quantity: recipient.quantity,
            },
          ]
        : [],
    }));

    const result = submitAllocationPlan(recipients);

    if (!result) {
      return;
    }

    setResultState(result);
    setSelectedPackGroup(null);
    setPackRecipients([createPackRecipient()]);
  }

  function openManagementSheet(item: InventoryItem) {
    setManagementDraft({
      item,
      email: item.email ?? '',
      phone: item.phone ?? '',
      quantity: 1,
    });
  }

  function submitManagementAction() {
    if (!managementDraft || managementError) {
      return;
    }

    const { item } = managementDraft;
    let itemIds: string[] = [item.id];

    if (item.status === 'unassigned') {
      itemIds = inventoryItems
        .filter(
          (inventoryItem) =>
            inventoryItem.status === 'unassigned' &&
            inventoryItem.destinationId === item.destinationId &&
            inventoryItem.packId === item.packId
        )
        .slice(0, managementDraft.quantity)
        .map((inventoryItem) => inventoryItem.id);
    }

    const result = assignInventoryItems(itemIds, {
      email: managementDraft.email,
      phone: managementDraft.phone,
    });

    if (!result) {
      return;
    }

    setManagementDraft(null);
    setResultState({
      preview: {
        lines: [],
        totalUnits: itemIds.length,
        stockUnits: itemIds.length,
        purchaseUnits: 0,
        walletDeductionUsd: 0,
        walletBalanceBeforeUsd: walletBalanceUsd,
        walletBalanceAfterUsd: walletBalanceUsd,
        hasInsufficientBalance: false,
      },
      assignedCount: result.assignmentOutcome === 'assigned' ? 1 : 0,
      pendingCount: result.assignmentOutcome === 'pending' ? 1 : 0,
      failedCount: result.assignmentOutcome === 'failed' ? 1 : 0,
      purchasedCount: 0,
      inventoryItems: result.updatedItems,
    });
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
          <View style={styles.modeRail}>
            {allocationModes.map((allocationMode) => {
              const isActive = allocationMode.key === mode;

              return (
                <Pressable
                  key={allocationMode.key}
                  onPress={() => setMode(allocationMode.key)}
                  style={[styles.modeChip, isActive && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>
                    {allocationMode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {mode === 'user' ? (
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
                            const stockGroup = stockGroups.find((group) => group.key === packKey);
                            const available = stockGroup?.availableQuantity ?? 0;
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
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Buying now</Text>
                    <Text style={styles.summaryValue}>{userPreview?.purchaseUnits ?? 0} packs</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Wallet impact</Text>
                    <Text style={styles.summaryValue}>
                      ${userPreview?.walletDeductionUsd.toFixed(2) ?? '0.00'}
                    </Text>
                  </View>
                  <Text style={styles.balanceHint}>Balance ${walletBalanceUsd.toFixed(2)}</Text>
                </View>

                {userValidationErrors.length ? (
                  <View style={styles.errorCard}>
                    {userValidationErrors.map((error) => (
                      <Text key={error} style={styles.errorText}>
                        {error}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={Boolean(userValidationErrors.length)}
                  label="Allocate all"
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
            ) : (
              <>
                <View style={styles.searchField}>
                  <Ionicons color={colors.textSoft} name="search-outline" size={18} />
                  <TextInput
                    onChangeText={setPackSearch}
                    placeholder="Search stock by destination or pack"
                    placeholderTextColor={colors.textSoft}
                    style={styles.searchInput}
                    value={packSearch}
                  />
                </View>

                {filteredStockGroups.map((group) => (
                  <View key={group.key} style={styles.stockCard}>
                    <View style={styles.stockTopRow}>
                      <View style={styles.stockCopy}>
                        <Text style={styles.stockTitle}>
                          {group.destinationFlag} {group.destinationName} • {group.packName}
                        </Text>
                        <Text style={styles.stockMeta}>
                          {group.dataAllowance} • {group.validity} • {group.availableQuantity} in stock
                        </Text>
                      </View>
                      <View style={styles.stockCountPill}>
                        <Text style={styles.stockCountText}>{group.availableQuantity}</Text>
                      </View>
                    </View>
                    <View style={styles.stockActions}>
                      <Text style={styles.stockHelperText}>
                        Assign this stock group directly to one or more users.
                      </Text>
                      <Pressable onPress={() => openPackAllocation(group)} style={styles.inlinePrimaryAction}>
                        <Text style={styles.inlinePrimaryActionText}>Assign</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {!filteredStockGroups.length ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No matching stock</Text>
                    <Text style={styles.emptyBody}>
                      Add more packs from Inventory when this destination is out of stock.
                    </Text>
                  </View>
                ) : null}
              </>
            )}
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
            {filteredAssignmentItems.map((item) => {
              const tone = getStatusTone(item.status);
              const availableGroupQuantity =
                item.status === 'unassigned'
                  ? inventoryItems.filter(
                      (inventoryItem) =>
                        inventoryItem.status === 'unassigned' &&
                        inventoryItem.destinationId === item.destinationId &&
                        inventoryItem.packId === item.packId
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
                        {item.email ?? item.phone ?? 'No user assigned'}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: tone.backgroundColor }]}>
                      <Text style={[styles.statusChipText, { color: tone.color }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.assignmentTime}>
                    Created {new Date(item.createdAt).toLocaleString()}
                    {item.assignedAt ? ` • Updated ${new Date(item.assignedAt).toLocaleString()}` : ''}
                  </Text>
                  {item.status === 'unassigned' ? (
                    <Text style={styles.assignmentQuantityHint}>{availableGroupQuantity} ready in this pack group</Text>
                  ) : null}
                  <Pressable onPress={() => openManagementSheet(item)} style={styles.inlineAction}>
                    <Text style={styles.inlineActionText}>{getManagementActionLabel(item.status)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <BottomSheetModal
        onClose={() => {
          setPickerRecipientId(null);
          setPickerQuery('');
        }}
        subtitle="Search once and attach packs to the selected user."
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

          {filteredPickerPacks.map((pack) => {
            const key = `${pack.destinationId}:${pack.packId}`;
            const available = stockGroups.find((group) => group.key === key)?.availableQuantity ?? 0;

            return (
              <Pressable
                key={key}
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
                    {pack.dataAllowance} • {pack.validity} • ${pack.priceUsd.toFixed(2)} • {available} in stock
                  </Text>
                </View>
                <Ionicons color={colors.primaryStrong} name="add-circle-outline" size={18} />
              </Pressable>
            );
          })}
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => {
          setSelectedPackGroup(null);
          setPackRecipients([createPackRecipient()]);
        }}
        subtitle={
          selectedPackGroup
            ? `${selectedPackGroup.destinationFlag} ${selectedPackGroup.destinationName} • ${selectedPackGroup.packName}`
            : undefined
        }
        title="Assign pack"
        visible={Boolean(selectedPackGroup)}
      >
        {selectedPackGroup ? (
          <View style={styles.sheetContent}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Available in stock</Text>
                <Text style={styles.summaryValue}>{selectedPackGroup.availableQuantity}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Buying shortfall</Text>
                <Text style={styles.summaryValue}>{selectedPackPreview?.purchaseUnits ?? 0} packs</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Wallet impact</Text>
                <Text style={styles.summaryValue}>
                  ${selectedPackPreview?.walletDeductionUsd.toFixed(2) ?? '0.00'}
                </Text>
              </View>
            </View>

            {packRecipients.map((recipient, index) => (
              <View key={recipient.id} style={styles.sheetRecipientCard}>
                <View style={styles.recipientHeader}>
                  <Text style={styles.recipientTitle}>Recipient {index + 1}</Text>
                  {packRecipients.length > 1 ? (
                    <Pressable onPress={() => removePackRecipient(recipient.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={(value) => updatePackRecipientField(recipient.id, 'email', value)}
                  placeholder="Email"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={recipient.email}
                />
                <TextInput
                  keyboardType="phone-pad"
                  onChangeText={(value) => updatePackRecipientField(recipient.id, 'phone', value)}
                  placeholder="Phone"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={recipient.phone}
                />

                <View style={styles.packRow}>
                  <View style={styles.packCopy}>
                    <Text style={styles.packName}>Quantity</Text>
                    <Text style={styles.packMeta}>
                      {selectedPackGroup.dataAllowance} • ${selectedPackGroup.priceUsd.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => updatePackRecipientQuantity(recipient.id, Math.max(0, recipient.quantity - 1))}
                      style={styles.stepperButton}
                    >
                      <Ionicons color={colors.primaryStrong} name="remove" size={14} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{recipient.quantity}</Text>
                    <Pressable
                      onPress={() => updatePackRecipientQuantity(recipient.id, recipient.quantity + 1)}
                      style={styles.stepperButton}
                    >
                      <Ionicons color={colors.primaryStrong} name="add" size={14} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {packValidationErrors.length ? (
              <View style={styles.errorCard}>
                {packValidationErrors.map((error) => (
                  <Text key={error} style={styles.errorText}>
                    {error}
                  </Text>
                ))}
              </View>
            ) : null}

            <PrimaryButton label="Add another user" onPress={addPackRecipient} variant="secondary" />
            <PrimaryButton
              disabled={Boolean(packValidationErrors.length)}
              label="Assign pack"
              onPress={submitPackAllocation}
            />
          </View>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setManagementDraft(null)}
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
              keyboardType="email-address"
              onChangeText={(value) => setManagementDraft((current) => (current ? { ...current, email: value } : current))}
              placeholder="Email"
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              value={managementDraft.email}
            />
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
                              current.item.status === 'unassigned' ? managementAvailableQuantity : 1,
                              current.quantity + 1
                            ),
                          }
                        : current
                    )
                  }
                  style={[
                    styles.stepperButton,
                    managementDraft.item.status !== 'unassigned' && styles.stepperButtonDisabled,
                  ]}
                >
                  <Ionicons
                    color={managementDraft.item.status !== 'unassigned' ? colors.textSoft : colors.primaryStrong}
                    name="add"
                    size={14}
                  />
                </Pressable>
              </View>
            </View>

            {managementError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{managementError}</Text>
              </View>
            ) : null}

            <PrimaryButton
              disabled={Boolean(managementError)}
              label={managementDraft.item.status === 'unassigned' ? 'Assign packs' : 'Save update'}
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
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    color: colors.danger,
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
