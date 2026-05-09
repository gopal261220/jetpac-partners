import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { BuyDestinationPdpScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { CartPillButton } from '../components/CartPillButton';
import { QuantityStepper } from '../components/QuantityStepper';
import { useBuyCart } from '../context/BuyCartContext';
import { findDestinationById } from '../data/catalog';

export function BuyDestinationPdpScreen({ navigation, route }: BuyDestinationPdpScreenProps) {
  const { destinationId } = route.params;
  const destination = findDestinationById(destinationId);
  const { getSelectionsForDestination, itemCount, upsertDestinationSelection } = useBuyCart();

  const currentSelections = useMemo(
    () => getSelectionsForDestination(destinationId),
    [destinationId, getSelectionsForDestination]
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(currentSelections);

  useEffect(() => {
    setQuantities(currentSelections);
  }, [currentSelections]);

  const selectedUnits = useMemo(
    () => Object.values(quantities).reduce((sum, value) => sum + value, 0),
    [quantities]
  );

  const selectedSubtotal = useMemo(() => {
    if (!destination) {
      return 0;
    }

    return destination.packs.reduce((sum, pack) => {
      const quantity = quantities[pack.id] ?? 0;
      return sum + quantity * pack.priceUsd;
    }, 0);
  }, [destination, quantities]);

  function updateQuantity(packId: string, nextQuantity: number) {
    setQuantities((current) => ({
      ...current,
      [packId]: Math.max(0, nextQuantity),
    }));
  }

  function handleSaveSelection() {
    if (!destination) {
      return;
    }

    upsertDestinationSelection(destination, quantities);
    navigation.navigate('DestinationList');
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
          <Text style={styles.emptyDescription}>
            Go back to the destination list and choose another country.
          </Text>
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
      rightAction={<CartPillButton itemCount={itemCount} onPress={() => navigation.navigate('Cart')} />}
      subtitle={`${destination.region} • choose one or more packs`}
      title={destination.name}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroFlag}>{destination.flag}</Text>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{destination.name} data packs</Text>
          <Text style={styles.heroSubtitle}>
            Operators can select multiple packs and quantities before sending them into the cart.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.packList} showsVerticalScrollIndicator={false}>
        {destination.packs.map((pack) => {
          const quantity = quantities[pack.id] ?? 0;

          return (
            <View key={pack.id} style={[styles.packCard, quantity > 0 && styles.packCardActive]}>
              <View style={styles.packHeader}>
                <View style={styles.packCopy}>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <Text style={styles.packMeta}>
                    {pack.dataAllowance} • {pack.validity}
                  </Text>
                </View>
                <Text style={styles.packPrice}>${pack.priceUsd}</Text>
              </View>

              <View style={styles.packFooter}>
                <Text style={styles.packHint}>
                  {quantity > 0 ? `${quantity} selected` : 'Tap + to add this pack'}
                </Text>
                <QuantityStepper
                  onDecrease={() => updateQuantity(pack.id, quantity - 1)}
                  onIncrease={() => updateQuantity(pack.id, quantity + 1)}
                  value={quantity}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footerCard}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerTitle}>
            {selectedUnits} pack{selectedUnits === 1 ? '' : 's'} selected
          </Text>
          <Text style={styles.footerAmount}>Subtotal ${selectedSubtotal.toFixed(2)}</Text>
        </View>
        <PrimaryButton
          disabled={selectedUnits === 0}
          label="Add selections to cart"
          onPress={handleSaveSelection}
        />
      </View>
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
  },
  heroFlag: {
    fontSize: 34,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  packList: {
    gap: 12,
    paddingBottom: 12,
  },
  packCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  packCardActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  packCopy: {
    flex: 1,
    gap: 4,
  },
  packName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  packMeta: {
    fontSize: 14,
    color: colors.textMuted,
  },
  packPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  packFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  packHint: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  footerCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  footerAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
