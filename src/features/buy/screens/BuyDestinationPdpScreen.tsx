import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AppTabsParamList, BuyDestinationPdpScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { CartPillButton } from '../components/CartPillButton';
import { QuantityStepper } from '../components/QuantityStepper';
import { useBuyCart } from '../context/BuyCartContext';
import { findDestinationById } from '../data/catalog';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export function BuyDestinationPdpScreen({ navigation, route }: BuyDestinationPdpScreenProps) {
  const { destinationId } = route.params;
  const destination = findDestinationById(destinationId);
  const { getSelectionsForDestination, itemCount, upsertDestinationSelection } = useBuyCart();
  const parentNavigation = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

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
      rightAction={<CartPillButton itemCount={itemCount} onPress={() => parentNavigation?.navigate('Cart')} />}
      subtitle={`${destination.region} • choose one or more packs`}
      title={destination.name}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroFlagOrb}>
          <Text style={styles.heroFlag}>{destination.flag}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{destination.name} data packs</Text>
          <Text style={styles.heroSubtitle}>
            Operators can select multiple packs and quantities before sending them into the cart.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Ionicons color={colors.primaryStrong} name="layers-outline" size={14} />
              <Text style={styles.heroMetaText}>{destination.packs.length} pack types</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Ionicons color={colors.primaryStrong} name="bag-check-outline" size={14} />
              <Text style={styles.heroMetaText}>Multi-select enabled</Text>
            </View>
          </View>
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
                  <View style={styles.packMetaRow}>
                    <View style={styles.packMetaChip}>
                      <Text style={styles.packMetaChipText}>{pack.dataAllowance}</Text>
                    </View>
                    <View style={styles.packMetaChip}>
                      <Text style={styles.packMetaChipText}>{pack.validity}</Text>
                    </View>
                  </View>
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
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroFlagOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  heroFlag: {
    fontSize: 32,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
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
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primarySoft,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
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
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  packCardActive: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
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
  packMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  packMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceSoft,
  },
  packMetaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  packName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  packPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryStrong,
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
    borderWidth: 1,
    borderColor: colors.border,
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
