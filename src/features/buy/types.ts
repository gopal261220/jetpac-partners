export type DataPack = {
  id: string;
  name: string;
  dataAllowance: string;
  validity: string;
  priceUsd: number;
};

export type DestinationCatalog = {
  id: string;
  name: string;
  flag: string;
  region: string;
  packs: DataPack[];
};

export type CartLine = {
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
