import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuyStackNavigator } from '../features/buy/navigation/BuyStackNavigator';
import { useBuyCart } from '../features/buy/context/BuyCartContext';
import { CartScreen } from '../screens/CartScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme/colors';
import type { AppTabsParamList } from './types';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const { itemCount } = useBuyCart();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarStyle: {
          height: 84,
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 8,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconName =
            route.name === 'Home'
              ? focused
                ? 'home'
                : 'home-outline'
              : route.name === 'Buy'
                ? focused
                  ? 'bag-handle'
                  : 'bag-handle-outline'
                : route.name === 'Cart'
                  ? focused
                    ? 'cart'
                    : 'cart-outline'
                  : route.name === 'Inventory'
                    ? focused
                      ? 'file-tray-stacked'
                      : 'file-tray-stacked-outline'
                    : focused
                      ? 'wallet'
                      : 'wallet-outline';

          const iconSize = route.name === 'Cart' ? 24 : size;
          return <Ionicons color={color} name={iconName} size={iconSize} />;
        },
        tabBarButton: (props) => {
          if (route.name !== 'Cart') {
            return (
              <Pressable
                accessibilityLabel={props.accessibilityLabel}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
                onLongPress={props.onLongPress}
                onPress={props.onPress}
                style={({ pressed }) => [styles.defaultTabButton, pressed && styles.defaultTabPressed]}
              >
                {typeof props.children === 'function' ? props.children({ pressed: false }) : props.children}
              </Pressable>
            );
          }

          return (
            <View pointerEvents="box-none" style={styles.cartTabButton}>
              <Pressable
                accessibilityLabel={props.accessibilityLabel}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
                onLongPress={props.onLongPress}
                onPress={props.onPress}
                style={({ pressed }) => [styles.cartTabPressable, pressed && styles.cartTabPressed]}
              >
                <View style={styles.cartTabInner}>
                  <Ionicons color={colors.surface} name="cart" size={24} />
                  {itemCount > 0 ? (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{itemCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.cartTabLabel,
                    props.accessibilityState?.selected && styles.cartTabLabelActive,
                  ]}
                >
                  Cart
                </Text>
              </Pressable>
            </View>
          );
        },
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={BuyStackNavigator} name="Buy" />
      <Tab.Screen
        component={CartScreen}
        name="Cart"
        options={{
          tabBarLabel: '',
        }}
      />
      <Tab.Screen component={InventoryScreen} name="Inventory" />
      <Tab.Screen component={WalletScreen} name="Wallet" />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  cartTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  defaultTabButton: {
    flex: 1,
  },
  defaultTabPressed: {
    opacity: 0.9,
  },
  cartTabPressable: {
    alignItems: 'center',
  },
  cartTabPressed: {
    opacity: 0.92,
  },
  cartTabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cartTabLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  cartTabLabelActive: {
    color: colors.primaryStrong,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
});
