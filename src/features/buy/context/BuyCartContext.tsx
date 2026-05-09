import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { CartLine, DestinationCatalog } from '../types';

type BuyCartContextValue = {
  lines: CartLine[];
  itemCount: number;
  destinationCount: number;
  subtotal: number;
  getSelectionsForDestination: (destinationId: string) => Record<string, number>;
  upsertDestinationSelection: (
    destination: DestinationCatalog,
    nextSelections: Record<string, number>
  ) => void;
  clearCart: () => void;
  removeLine: (destinationId: string, packId: string) => void;
};

const BuyCartContext = createContext<BuyCartContextValue | undefined>(undefined);

export function BuyCartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<BuyCartContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const destinationCount = new Set(lines.map((line) => line.destinationId)).size;
    const subtotal = lines.reduce((sum, line) => sum + line.priceUsd * line.quantity, 0);

    return {
      lines,
      itemCount,
      destinationCount,
      subtotal,
      getSelectionsForDestination(destinationId) {
        return lines
          .filter((line) => line.destinationId === destinationId)
          .reduce<Record<string, number>>((accumulator, line) => {
            accumulator[line.packId] = line.quantity;
            return accumulator;
          }, {});
      },
      upsertDestinationSelection(destination, nextSelections) {
        const nextLines = destination.packs
          .map((pack) => ({
            destinationId: destination.id,
            destinationName: destination.name,
            destinationFlag: destination.flag,
            packId: pack.id,
            packName: pack.name,
            dataAllowance: pack.dataAllowance,
            validity: pack.validity,
            priceUsd: pack.priceUsd,
            quantity: nextSelections[pack.id] ?? 0,
          }))
          .filter((line) => line.quantity > 0);

        setLines((currentLines) => {
          const remainingLines = currentLines.filter((line) => line.destinationId !== destination.id);
          return [...remainingLines, ...nextLines];
        });
      },
      clearCart() {
        setLines([]);
      },
      removeLine(destinationId, packId) {
        setLines((currentLines) =>
          currentLines.filter(
            (line) => !(line.destinationId === destinationId && line.packId === packId)
          )
        );
      },
    };
  }, [lines]);

  return <BuyCartContext.Provider value={value}>{children}</BuyCartContext.Provider>;
}

export function useBuyCart() {
  const value = useContext(BuyCartContext);

  if (!value) {
    throw new Error('useBuyCart must be used within a BuyCartProvider');
  }

  return value;
}
