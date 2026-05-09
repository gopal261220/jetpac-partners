import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { BuyStackParamList } from '../../../navigation/types';
import { BuyCartScreen } from '../screens/BuyCartScreen';
import { BuyDestinationListScreen } from '../screens/BuyDestinationListScreen';
import { BuyDestinationPdpScreen } from '../screens/BuyDestinationPdpScreen';

const Stack = createNativeStackNavigator<BuyStackParamList>();

export function BuyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={BuyDestinationListScreen} name="DestinationList" />
      <Stack.Screen component={BuyDestinationPdpScreen} name="DestinationPdp" />
      <Stack.Screen component={BuyCartScreen} name="Cart" />
    </Stack.Navigator>
  );
}
