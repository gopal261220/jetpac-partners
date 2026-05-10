import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type {
  AllocationPreview,
  AllocationPreviewLine,
  AllocationRecipientDraft,
  AllocationResult,
  AssignmentOutcome,
  DestinationCatalog,
  EsimInventoryBatch,
  InventoryItem,
  InventoryStatus,
  PurchaseOutcome,
  PurchasePreview,
  RecipientDraft,
  RequestedPack,
  SelectedPackQuantities,
  StockGroup,
  WalletTransaction,
} from '../types';

const INITIAL_WALLET_BALANCE_USD = 428.5;
const ESIM_UNIT_PRICE_USD = 1;

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-seed-1',
    destinationId: 'japan',
    destinationName: 'Japan',
    destinationFlag: '🇯🇵',
    packId: 'japan-5gb',
    packName: 'Shinkansen',
    dataAllowance: '5 GB',
    validity: '15 days',
    priceUsd: 14,
    status: 'assigned',
    email: 'akash@zenkiosk.co',
    createdAt: '2026-05-09T08:55:00.000Z',
    assignedAt: '2026-05-09T08:56:00.000Z',
  },
  {
    id: 'inv-seed-2',
    destinationId: 'europe',
    destinationName: 'Europe',
    destinationFlag: '🇪🇺',
    packId: 'europe-10gb',
    packName: 'Euro Flex',
    dataAllowance: '10 GB',
    validity: '15 days',
    priceUsd: 19,
    status: 'unassigned',
    createdAt: '2026-05-09T08:48:00.000Z',
  },
  {
    id: 'inv-seed-3',
    destinationId: 'india',
    destinationName: 'India',
    destinationFlag: '🇮🇳',
    packId: 'india-3gb',
    packName: 'Traveller Pack',
    dataAllowance: '3 GB',
    validity: '15 days',
    priceUsd: 8,
    status: 'failed',
    phone: '+65 9123 4567',
    createdAt: '2026-05-09T08:34:00.000Z',
  },
];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'txn-seed-1',
    title: 'Europe 10 GB purchased',
    amountUsd: -19,
    balanceAfterUsd: 428.5,
    createdAt: '2026-05-09T08:48:00.000Z',
  },
  {
    id: 'txn-seed-2',
    title: 'Manual credit preload',
    amountUsd: 160,
    balanceAfterUsd: 447.5,
    createdAt: '2026-05-09T07:20:00.000Z',
  },
];

const INITIAL_ESIM_BATCHES: EsimInventoryBatch[] = [
  {
    id: 'esim-batch-1',
    quantity: 24,
    unitPriceUsd: ESIM_UNIT_PRICE_USD,
    createdAt: '2026-05-09T09:05:00.000Z',
  },
  {
    id: 'esim-batch-2',
    quantity: 12,
    unitPriceUsd: ESIM_UNIT_PRICE_USD,
    createdAt: '2026-05-08T11:40:00.000Z',
  },
];

export type BuyDraftSelection = {
  destinationId: string;
  destinationName: string;
  destinationFlag: string;
  quantities: SelectedPackQuantities;
};

type BuyFlowContextValue = {
  draftSelection: BuyDraftSelection | null;
  walletBalanceUsd: number;
  inventoryItems: InventoryItem[];
  esimInventoryBatches: EsimInventoryBatch[];
  totalEsimInventory: number;
  transactions: WalletTransaction[];
  stockGroups: StockGroup[];
  getSelectionsForDestination: (destinationId: string) => SelectedPackQuantities;
  setDraftSelection: (destination: DestinationCatalog, quantities: SelectedPackQuantities) => void;
  clearDraftSelection: () => void;
  buildPurchasePreview: (
    destination: DestinationCatalog,
    quantities: SelectedPackQuantities
  ) => PurchasePreview | null;
  completePurchase: (
    destination: DestinationCatalog,
    quantities: SelectedPackQuantities,
    recipient: RecipientDraft
  ) => PurchaseOutcome | null;
  assignInventoryItems: (
    itemIds: string[],
    recipient: RecipientDraft
  ) => { assignmentOutcome: AssignmentOutcome; updatedItems: InventoryItem[] } | null;
  buildAllocationPreview: (recipients: AllocationRecipientDraft[]) => AllocationPreview | null;
  submitAllocationPlan: (recipients: AllocationRecipientDraft[]) => AllocationResult | null;
  buyRequestedPacksToInventory: (requestedPacks: RequestedPack[]) => PurchaseOutcome | null;
  purchaseEsimsToInventory: (quantity: number) => EsimInventoryBatch | null;
};

const BuyFlowContext = createContext<BuyFlowContextValue | undefined>(undefined);

function resolveAssignmentOutcome(recipient: RecipientDraft): AssignmentOutcome {
  const normalizedEmail = recipient.email.trim().toLowerCase();
  const normalizedPhone = recipient.phone.trim();

  if (!normalizedEmail && !normalizedPhone) {
    return 'unassigned';
  }

  if (normalizedEmail.includes('fail') || normalizedPhone.endsWith('000')) {
    return 'failed';
  }

  if (!normalizedEmail && normalizedPhone) {
    return 'pending';
  }

  return 'assigned';
}

function toInventoryStatus(outcome: AssignmentOutcome): InventoryStatus {
  if (outcome === 'assigned' || outcome === 'pending' || outcome === 'failed') {
    return outcome;
  }

  return 'unassigned';
}

function buildTransactionTitle(destinationName: string, totalUnits: number) {
  return `${destinationName} purchase • ${totalUnits} pack${totalUnits === 1 ? '' : 's'}`;
}

function buildStockGroups(items: InventoryItem[]) {
  const groups = new Map<string, StockGroup>();

  items
    .filter((item) => item.status === 'unassigned')
    .forEach((item) => {
      const key = `${item.destinationId}:${item.packId}`;
      const current = groups.get(key);

      if (current) {
        current.availableQuantity += 1;
        return;
      }

      groups.set(key, {
        key,
        destinationId: item.destinationId,
        destinationName: item.destinationName,
        destinationFlag: item.destinationFlag,
        packId: item.packId,
        packName: item.packName,
        dataAllowance: item.dataAllowance,
        validity: item.validity,
        priceUsd: item.priceUsd,
        availableQuantity: 1,
      });
    });

  return Array.from(groups.values()).sort((left, right) =>
    `${left.destinationName}${left.packName}`.localeCompare(`${right.destinationName}${right.packName}`)
  );
}

function createPurchasePreview(
  destination: DestinationCatalog,
  quantities: SelectedPackQuantities,
  walletBalanceUsd: number
): PurchasePreview | null {
  const lines = destination.packs
    .map((pack) => {
      const quantity = Math.max(0, quantities[pack.id] ?? 0);

      return {
        packId: pack.id,
        packName: pack.name,
        dataAllowance: pack.dataAllowance,
        validity: pack.validity,
        unitPriceUsd: pack.priceUsd,
        quantity,
        totalPriceUsd: pack.priceUsd * quantity,
      };
    })
    .filter((line) => line.quantity > 0);

  if (!lines.length) {
    return null;
  }

  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalUsd = lines.reduce((sum, line) => sum + line.totalPriceUsd, 0);

  return {
    destinationId: destination.id,
    destinationName: destination.name,
    destinationFlag: destination.flag,
    lines,
    totalUnits,
    subtotalUsd,
    walletBalanceBeforeUsd: walletBalanceUsd,
    walletBalanceAfterUsd: walletBalanceUsd - subtotalUsd,
  };
}

function createInventoryItemsFromRequestedPacks(
  requestedPacks: RequestedPack[],
  recipient: RecipientDraft,
  timestamp: string
) {
  const assignmentOutcome = resolveAssignmentOutcome(recipient);
  const status = toInventoryStatus(assignmentOutcome);

  const inventoryItems = requestedPacks.flatMap((pack) =>
    Array.from({ length: pack.quantity }, (_, index) => ({
      id: `inv-${Date.now()}-${pack.packId}-${index + 1}`,
      destinationId: pack.destinationId,
      destinationName: pack.destinationName,
      destinationFlag: pack.destinationFlag,
      packId: pack.packId,
      packName: pack.packName,
      dataAllowance: pack.dataAllowance,
      validity: pack.validity,
      priceUsd: pack.priceUsd,
      status,
      email: recipient.email.trim() || undefined,
      phone: recipient.phone.trim() || undefined,
      createdAt: timestamp,
      assignedAt: assignmentOutcome === 'assigned' ? timestamp : undefined,
    }))
  );

  return { assignmentOutcome, inventoryItems };
}

function buildRequestedPackLines(
  recipients: AllocationRecipientDraft[],
  stockGroups: StockGroup[],
  walletBalanceUsd: number
): AllocationPreview | null {
  const aggregated = new Map<string, AllocationPreviewLine>();

  recipients.forEach((recipient) => {
    recipient.requestedPacks.forEach((pack) => {
      if (pack.quantity < 1) {
        return;
      }

      const key = `${pack.destinationId}:${pack.packId}`;
      const current = aggregated.get(key);

      if (current) {
        current.quantity += pack.quantity;
        return;
      }

      aggregated.set(key, {
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

  const lines = Array.from(aggregated.values());

  if (!lines.length) {
    return null;
  }

  lines.forEach((line) => {
    const stockGroup = stockGroups.find((group) => group.key === line.key);
    const availableQuantity = stockGroup?.availableQuantity ?? 0;
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

export function BuyFlowProvider({ children }: PropsWithChildren) {
  const [draftSelection, setDraftSelectionState] = useState<BuyDraftSelection | null>(null);
  const [walletBalanceUsd, setWalletBalanceUsd] = useState(INITIAL_WALLET_BALANCE_USD);
  const [inventoryItems, setInventoryItems] = useState(INITIAL_INVENTORY);
  const [esimInventoryBatches, setEsimInventoryBatches] = useState(INITIAL_ESIM_BATCHES);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  const stockGroups = useMemo(() => buildStockGroups(inventoryItems), [inventoryItems]);
  const totalEsimInventory = useMemo(
    () => esimInventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0),
    [esimInventoryBatches]
  );

  const value = useMemo<BuyFlowContextValue>(
    () => ({
      draftSelection,
      walletBalanceUsd,
      inventoryItems,
      esimInventoryBatches,
      totalEsimInventory,
      transactions,
      stockGroups,
      getSelectionsForDestination(destinationId) {
        if (!draftSelection || draftSelection.destinationId !== destinationId) {
          return {};
        }

        return draftSelection.quantities;
      },
      setDraftSelection(destination, quantities) {
        const filteredQuantities = Object.entries(quantities).reduce<SelectedPackQuantities>(
          (accumulator, [packId, quantity]) => {
            if (quantity > 0) {
              accumulator[packId] = quantity;
            }

            return accumulator;
          },
          {}
        );

        setDraftSelectionState({
          destinationId: destination.id,
          destinationName: destination.name,
          destinationFlag: destination.flag,
          quantities: filteredQuantities,
        });
      },
      clearDraftSelection() {
        setDraftSelectionState(null);
      },
      buildPurchasePreview(destination, quantities) {
        return createPurchasePreview(destination, quantities, walletBalanceUsd);
      },
      completePurchase(destination, quantities, recipient) {
        const preview = createPurchasePreview(destination, quantities, walletBalanceUsd);

        if (!preview || preview.walletBalanceAfterUsd < 0) {
          return null;
        }

        const requestedPacks: RequestedPack[] = preview.lines.map((line) => ({
          destinationId: destination.id,
          destinationName: destination.name,
          destinationFlag: destination.flag,
          packId: line.packId,
          packName: line.packName,
          dataAllowance: line.dataAllowance,
          validity: line.validity,
          priceUsd: line.unitPriceUsd,
          quantity: line.quantity,
        }));

        const now = new Date().toISOString();
        const created = createInventoryItemsFromRequestedPacks(requestedPacks, recipient, now);
        const transaction: WalletTransaction = {
          id: `txn-${Date.now()}`,
          title: buildTransactionTitle(destination.name, preview.totalUnits),
          amountUsd: -preview.subtotalUsd,
          balanceAfterUsd: preview.walletBalanceAfterUsd,
          createdAt: now,
        };

        setWalletBalanceUsd(preview.walletBalanceAfterUsd);
        setTransactions((current) => [transaction, ...current]);
        setInventoryItems((current) => [...created.inventoryItems, ...current]);
        setDraftSelectionState(null);

        return {
          preview,
          assignmentOutcome: created.assignmentOutcome,
          inventoryItems: created.inventoryItems,
        };
      },
      assignInventoryItems(itemIds, recipient) {
        if (!itemIds.length) {
          return null;
        }

        const assignmentOutcome = resolveAssignmentOutcome(recipient);
        const status = toInventoryStatus(assignmentOutcome);
        const now = new Date().toISOString();
        let updatedItems: InventoryItem[] = [];

        setInventoryItems((current) =>
          current.map((item) => {
            if (!itemIds.includes(item.id)) {
              return item;
            }

            const nextItem: InventoryItem = {
              ...item,
              status,
              email: recipient.email.trim() || undefined,
              phone: recipient.phone.trim() || undefined,
              assignedAt: assignmentOutcome === 'assigned' ? now : item.assignedAt,
            };

            updatedItems = [...updatedItems, nextItem];
            return nextItem;
          })
        );

        return {
          assignmentOutcome,
          updatedItems,
        };
      },
      buildAllocationPreview(recipients) {
        return buildRequestedPackLines(recipients, stockGroups, walletBalanceUsd);
      },
      submitAllocationPlan(recipients) {
        const actionableRecipients = recipients.filter(
          (recipient) =>
            Boolean(recipient.email.trim() || recipient.phone.trim()) &&
            recipient.requestedPacks.some((pack) => pack.quantity > 0)
        );

        const preview = buildRequestedPackLines(actionableRecipients, stockGroups, walletBalanceUsd);

        if (!preview || preview.hasInsufficientBalance) {
          return null;
        }

        const stockQueues = new Map<string, string[]>();
        inventoryItems
          .filter((item) => item.status === 'unassigned')
          .forEach((item) => {
            const key = `${item.destinationId}:${item.packId}`;
            const queue = stockQueues.get(key) ?? [];
            queue.push(item.id);
            stockQueues.set(key, queue);
          });

        const now = new Date().toISOString();
        const stockAssignments = new Map<string, RecipientDraft>();
        const purchasedInventoryItems: InventoryItem[] = [];
        let assignedCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let purchasedCount = 0;

        actionableRecipients.forEach((recipient) => {
          const assignmentOutcome = resolveAssignmentOutcome(recipient);

          if (assignmentOutcome === 'assigned') {
            assignedCount += 1;
          } else if (assignmentOutcome === 'pending') {
            pendingCount += 1;
          } else if (assignmentOutcome === 'failed') {
            failedCount += 1;
          }

          recipient.requestedPacks.forEach((pack) => {
            const key = `${pack.destinationId}:${pack.packId}`;
            const queue = stockQueues.get(key) ?? [];
            const stockItemIds = queue.slice(0, pack.quantity);
            stockQueues.set(key, queue.slice(stockItemIds.length));

            stockItemIds.forEach((itemId) => {
              stockAssignments.set(itemId, {
                email: recipient.email,
                phone: recipient.phone,
              });
            });

            const purchaseQuantity = Math.max(0, pack.quantity - stockItemIds.length);

            if (!purchaseQuantity) {
              return;
            }

            purchasedCount += purchaseQuantity;

            const created = createInventoryItemsFromRequestedPacks(
              [{ ...pack, quantity: purchaseQuantity }],
              {
                email: recipient.email,
                phone: recipient.phone,
              },
              now
            );

            purchasedInventoryItems.push(...created.inventoryItems);
          });
        });

        if (preview.walletDeductionUsd > 0) {
          const transaction: WalletTransaction = {
            id: `txn-${Date.now()}`,
            title: `Allocation flow • ${preview.purchaseUnits} pack${preview.purchaseUnits === 1 ? '' : 's'}`,
            amountUsd: -preview.walletDeductionUsd,
            balanceAfterUsd: preview.walletBalanceAfterUsd,
            createdAt: now,
          };

          setWalletBalanceUsd(preview.walletBalanceAfterUsd);
          setTransactions((current) => [transaction, ...current]);
        }

        setInventoryItems((current) => {
          const updatedCurrent = current.map((item) => {
            const recipient = stockAssignments.get(item.id);

            if (!recipient) {
              return item;
            }

            const assignmentOutcome = resolveAssignmentOutcome(recipient);
            const status = toInventoryStatus(assignmentOutcome);

            return {
              ...item,
              status,
              email: recipient.email.trim() || undefined,
              phone: recipient.phone.trim() || undefined,
              assignedAt: assignmentOutcome === 'assigned' ? now : item.assignedAt,
            };
          });

          return [...purchasedInventoryItems, ...updatedCurrent];
        });

        return {
          preview,
          assignedCount,
          pendingCount,
          failedCount,
          purchasedCount,
          inventoryItems: purchasedInventoryItems,
        };
      },
      buyRequestedPacksToInventory(requestedPacks) {
        const preview = buildRequestedPackLines(
          [
            {
              id: 'inventory-buy',
              email: '',
              phone: '',
              requestedPacks,
            },
          ],
          [],
          walletBalanceUsd
        );

        if (!preview || preview.hasInsufficientBalance) {
          return null;
        }

        const now = new Date().toISOString();
        const created = createInventoryItemsFromRequestedPacks(
          requestedPacks,
          { email: '', phone: '' },
          now
        );
        const transaction: WalletTransaction = {
          id: `txn-${Date.now()}`,
          title: `Inventory top-up • ${preview.totalUnits} pack${preview.totalUnits === 1 ? '' : 's'}`,
          amountUsd: -preview.walletDeductionUsd,
          balanceAfterUsd: preview.walletBalanceAfterUsd,
          createdAt: now,
        };

        setWalletBalanceUsd(preview.walletBalanceAfterUsd);
        setTransactions((current) => [transaction, ...current]);
        setInventoryItems((current) => [...created.inventoryItems, ...current]);

        return {
          preview: {
            destinationId: requestedPacks[0]?.destinationId ?? 'inventory',
            destinationName: requestedPacks[0]?.destinationName ?? 'Inventory',
            destinationFlag: requestedPacks[0]?.destinationFlag ?? '📦',
            lines: requestedPacks.map((pack) => ({
              packId: pack.packId,
              packName: pack.packName,
              dataAllowance: pack.dataAllowance,
              validity: pack.validity,
              unitPriceUsd: pack.priceUsd,
              quantity: pack.quantity,
              totalPriceUsd: pack.quantity * pack.priceUsd,
            })),
            totalUnits: preview.totalUnits,
            subtotalUsd: preview.walletDeductionUsd,
            walletBalanceBeforeUsd: preview.walletBalanceBeforeUsd,
            walletBalanceAfterUsd: preview.walletBalanceAfterUsd,
          },
          assignmentOutcome: 'unassigned',
          inventoryItems: created.inventoryItems,
        };
      },
      purchaseEsimsToInventory(quantity) {
        const normalizedQuantity = Math.max(0, Math.floor(quantity));
        const totalCostUsd = normalizedQuantity * ESIM_UNIT_PRICE_USD;

        if (!normalizedQuantity || walletBalanceUsd - totalCostUsd < 0) {
          return null;
        }

        const now = new Date().toISOString();
        const batch: EsimInventoryBatch = {
          id: `esim-${Date.now()}`,
          quantity: normalizedQuantity,
          unitPriceUsd: ESIM_UNIT_PRICE_USD,
          createdAt: now,
        };
        const nextBalance = walletBalanceUsd - totalCostUsd;
        const transaction: WalletTransaction = {
          id: `txn-${Date.now()}-esim`,
          title: `eSIM inventory • ${normalizedQuantity} unit${normalizedQuantity === 1 ? '' : 's'}`,
          amountUsd: -totalCostUsd,
          balanceAfterUsd: nextBalance,
          createdAt: now,
        };

        setWalletBalanceUsd(nextBalance);
        setEsimInventoryBatches((current) => [batch, ...current]);
        setTransactions((current) => [transaction, ...current]);

        return batch;
      },
    }),
    [
      draftSelection,
      esimInventoryBatches,
      inventoryItems,
      stockGroups,
      totalEsimInventory,
      transactions,
      walletBalanceUsd,
    ]
  );

  return <BuyFlowContext.Provider value={value}>{children}</BuyFlowContext.Provider>;
}

export function useBuyFlow() {
  const value = useContext(BuyFlowContext);

  if (!value) {
    throw new Error('useBuyFlow must be used within a BuyFlowProvider');
  }

  return value;
}
