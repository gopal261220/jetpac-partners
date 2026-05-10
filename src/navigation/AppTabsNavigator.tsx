import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BuyStackNavigator } from '../features/buy/navigation/BuyStackNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { colors } from '../theme/colors';
import type { AppTabsParamList } from './types';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
        },
        tabBarStyle: {
          height: 84,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
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
                : route.name === 'Wallet'
                  ? focused
                    ? 'wallet'
                    : 'wallet-outline'
                  : focused
                    ? 'file-tray-stacked'
                    : 'file-tray-stacked-outline';

          return <Ionicons color={color} name={iconName} size={size} />;
        },
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen
        component={BuyStackNavigator}
        name="Buy"
        options={{ tabBarLabel: 'Allocate' }}
      />
      <Tab.Screen component={WalletScreen} name="Wallet" />
      <Tab.Screen component={InventoryScreen} name="Inventory" />
    </Tab.Navigator>
  );
}
