import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '../../../components/ScreenContainer';
import type { BuyDestinationListScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { destinationCatalog } from '../data/catalog';
import type { DestinationCategory } from '../types';

const categoryFilters: Array<'All' | DestinationCategory> = ['All', 'Popular', 'Regional', 'Global'];

export function BuyDestinationListScreen({ navigation }: BuyDestinationListScreenProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | DestinationCategory>('All');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredDestinations = useMemo(() => {
    return destinationCatalog.filter((destination) => {
      const matchesCategory =
        activeCategory === 'All' ? true : destination.category === activeCategory;
      const matchesQuery =
        !deferredQuery ||
        destination.name.toLowerCase().includes(deferredQuery) ||
        destination.region.toLowerCase().includes(deferredQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, deferredQuery]);

  return (
    <ScreenContainer
      subtitle="Pick a destination, then finish the pack flow from one focused screen."
      title="Buy Pack"
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredDestinations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const startingPrice = Math.min(...item.packs.map((pack) => pack.priceUsd));

          return (
            <Pressable
              onPress={() => navigation.navigate('DestinationPdp', { destinationId: item.id })}
              style={({ pressed }) => [styles.destinationCard, pressed && styles.cardPressed]}
            >
              <View style={styles.cardMain}>
                <View style={styles.flagOrb}>
                  <Text style={styles.flag}>{item.flag}</Text>
                </View>

                <View style={styles.destinationCopy}>
                  <View style={styles.destinationTitleRow}>
                    <Text style={styles.destinationName}>{item.name}</Text>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>{item.category}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.destinationMeta}>
                    {item.region} • from ${startingPrice.toFixed(2)}
                  </Text>
                </View>

                <Ionicons color={colors.primaryStrong} name="chevron-forward" size={18} />
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle}>Destination</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Fast flow</Text>
              </View>
            </View>
            <View style={styles.searchField}>
              <Ionicons color="rgba(255,255,255,0.78)" name="search-outline" size={16} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor="rgba(255,255,255,0.62)"
                style={styles.searchInput}
                value={query}
              />
            </View>
            <View style={styles.filterRow}>
              {categoryFilters.map((filter) => {
                const isActive = filter === activeCategory;

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveCategory(filter)}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No destinations found</Text>
            <Text style={styles.emptySubtitle}>Try another destination or filter.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.surface,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.surface,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.surface,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  filterChipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.body,
    color: 'rgba(255,255,255,0.78)',
  },
  filterChipTextActive: {
    color: colors.primaryStrong,
  },
  destinationCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagOrb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  flag: {
    fontSize: 22,
  },
  destinationCopy: {
    flex: 1,
    gap: 3,
  },
  destinationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.primaryStrong,
  },
  destinationMeta: {
    fontSize: 12,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
  emptyState: {
    borderRadius: 26,
    backgroundColor: colors.surface,
    padding: 22,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
});
