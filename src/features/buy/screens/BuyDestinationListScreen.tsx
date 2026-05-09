import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AppTabsParamList, BuyDestinationListScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { useBuyCart } from '../context/BuyCartContext';
import { destinationCatalog } from '../data/catalog';
import { CartPillButton } from '../components/CartPillButton';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export function BuyDestinationListScreen({ navigation }: BuyDestinationListScreenProps) {
  const { destinationCount, itemCount, subtotal } = useBuyCart();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const parentNavigation = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  const filteredDestinations = useMemo(() => {
    if (!deferredQuery) {
      return destinationCatalog;
    }

    return destinationCatalog.filter((destination) =>
      destination.name.toLowerCase().includes(deferredQuery)
    );
  }, [deferredQuery]);

  return (
    <ScreenContainer
      rightAction={<CartPillButton itemCount={itemCount} onPress={() => parentNavigation?.navigate('Cart')} />}
      subtitle="Choose a destination first, then select one or more packs."
      title="Buy data packs"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons color={colors.primaryStrong} name="earth-outline" size={18} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Pick a travel destination</Text>
          <Text style={styles.heroSubtitle}>
            Search by country or region, then open the PDP to add multiple packs into the cart.
          </Text>
        </View>
      </View>

      <View style={styles.searchBlock}>
        <View style={styles.searchField}>
          <Ionicons color={colors.textSoft} name="search-outline" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search destination"
            placeholderTextColor="#7A869A"
            style={styles.searchInput}
            value={query}
          />
        </View>
        {itemCount > 0 ? (
          <View style={styles.cartSummary}>
            <Text style={styles.cartSummaryTitle}>
              {itemCount} pack{itemCount > 1 ? 's' : ''} in cart across {destinationCount}{' '}
              destination{destinationCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.cartSummaryValue}>Subtotal ${subtotal.toFixed(2)}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredDestinations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('DestinationPdp', { destinationId: item.id })}
            style={({ pressed }) => [styles.destinationCard, pressed && styles.cardPressed]}
          >
            <View style={styles.destinationHeader}>
              <View style={styles.flagOrb}>
                <Text style={styles.flag}>{item.flag}</Text>
              </View>
              <View style={styles.destinationCopy}>
                <Text style={styles.destinationName}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{item.region}</Text>
                  </View>
                  <Text style={styles.destinationMeta}>{item.packs.length} packs</Text>
                </View>
              </View>
            </View>
            <Ionicons color={colors.primaryStrong} name="chevron-forward" size={20} />
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No destination found</Text>
            <Text style={styles.emptySubtitle}>Try a different country or region name.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 28,
    padding: 18,
    backgroundColor: colors.surface,
  },
  heroBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  searchBlock: {
    gap: 12,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
  },
  cartSummary: {
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    padding: 15,
    gap: 4,
  },
  cartSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cartSummaryValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  destinationCard: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  flagOrb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  flag: {
    fontSize: 28,
  },
  destinationCopy: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSoft,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  destinationName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  destinationMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyState: {
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
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
