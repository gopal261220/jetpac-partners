export type DestinationCategory = 'Popular' | 'Regional' | 'Global';

export type DataPack = {
  id: string;
  name: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
};

export type DestinationCatalog = {
  id: string;
  apiName?: string;
  name: string;
  flag: string;
  region: string;
  category: DestinationCategory;
  teaser: string;
  packs: DataPack[];
};

export type SelectedPackQuantities = Record<string, number>;

export type RecipientDraft = {
  email: string;
  phone: string;
};

export type AllocationMode = 'user' | 'pack';

export type RequestedPack = {
  destinationId: string;
  destinationName: string;
  destinationFlag: string;
  packId: string;
  packName: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
  quantity: number;
};

export type AllocationRecipientDraft = {
  id: string;
  email: string;
  phone: string;
  requestedPacks: RequestedPack[];
};

export type PurchasePreviewLine = {
  packId: string;
  packName: string;
  dataAllowance: string;
  validity: string;
  unitPriceUsd: number;
  quantity: number;
  totalPriceUsd: number;
};

export type PurchasePreview = {
  destinationId: string;
  destinationName: string;
  destinationFlag: string;
  lines: PurchasePreviewLine[];
  totalUnits: number;
  subtotalUsd: number;
  walletBalanceBeforeUsd: number;
  walletBalanceAfterUsd: number;
};

export type InventoryStatus = 'unassigned' | 'assigned' | 'pending' | 'failed';

export type InventoryItem = {
  id: string;
  destinationId: string;
  destinationName: string;
  destinationFlag: string;
  packId: string;
  packName: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
  status: InventoryStatus;
  email?: string;
  phone?: string;
  createdAt: string;
  assignedAt?: string;
};

export type StockGroup = {
  key: string;
  destinationId: string;
  destinationName: string;
  destinationFlag: string;
  packId: string;
  packName: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
  availableQuantity: number;
};

export type WalletTransaction = {
  id: string;
  title: string;
  amountUsd: number;
  balanceAfterUsd: number;
  createdAt: string;
};

export type EsimInventoryBatch = {
  id: string;
  quantity: number;
  unitPriceUsd: number;
  createdAt: string;
};

export type AssignmentOutcome = 'assigned' | 'pending' | 'failed' | 'unassigned';

export type PurchaseOutcome = {
  preview: PurchasePreview;
  assignmentOutcome: AssignmentOutcome;
  inventoryItems: InventoryItem[];
};

export type AllocationPreviewLine = {
  key: string;
  destinationName: string;
  destinationFlag: string;
  packName: string;
  quantity: number;
  fromStockQuantity: number;
  purchaseQuantity: number;
  unitPriceUsd: number;
  purchaseCostUsd: number;
};

export type AllocationPreview = {
  lines: AllocationPreviewLine[];
  totalUnits: number;
  stockUnits: number;
  purchaseUnits: number;
  walletDeductionUsd: number;
  walletBalanceBeforeUsd: number;
  walletBalanceAfterUsd: number;
  hasInsufficientBalance: boolean;
};

export type AllocationResult = {
  preview: AllocationPreview;
  assignedCount: number;
  pendingCount: number;
  failedCount: number;
  purchasedCount: number;
  inventoryItems: InventoryItem[];
};
