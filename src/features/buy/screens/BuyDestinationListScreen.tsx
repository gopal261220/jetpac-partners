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
import type { BuyDestinationListScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { useBuyCart } from '../context/BuyCartContext';
import { destinationCatalog } from '../data/catalog';
import { CartPillButton } from '../components/CartPillButton';

export function BuyDestinationListScreen({ navigation }: BuyDestinationListScreenProps) {
  const { destinationCount, itemCount, subtotal } = useBuyCart();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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
      rightAction={<CartPillButton itemCount={itemCount} onPress={() => navigation.navigate('Cart')} />}
      subtitle="Search destinations, then choose packs on the PDP."
      title="Buy data packs"
    >
      <View style={styles.searchBlock}>
        <TextInput
          onChangeText={setQuery}
          placeholder="Search destination"
          placeholderTextColor="#7A869A"
          style={styles.searchInput}
          value={query}
        />
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
              <Text style={styles.flag}>{item.flag}</Text>
              <View style={styles.destinationCopy}>
                <Text style={styles.destinationName}>{item.name}</Text>
                <Text style={styles.destinationMeta}>
                  {item.region} • {item.packs.length} packs
                </Text>
              </View>
            </View>
            <Text style={styles.destinationHint}>View packs</Text>
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
  searchBlock: {
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
  },
  cartSummary: {
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    padding: 14,
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
  flag: {
    fontSize: 30,
  },
  destinationCopy: {
    flex: 1,
    gap: 4,
  },
  destinationName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  destinationMeta: {
    fontSize: 14,
    color: colors.textMuted,
  },
  destinationHint: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
