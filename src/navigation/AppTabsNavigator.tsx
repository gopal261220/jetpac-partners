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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
        },
        tabBarStyle: {
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={BuyStackNavigator} name="Buy" />
      <Tab.Screen component={InventoryScreen} name="Inventory" />
      <Tab.Screen component={WalletScreen} name="Wallet" />
    </Tab.Navigator>
  );
}
