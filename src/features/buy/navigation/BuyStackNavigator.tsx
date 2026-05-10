import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { BuyStackParamList } from '../../../navigation/types';
import { AllocateWorkspaceScreen } from '../screens/AllocateWorkspaceScreen';

const Stack = createNativeStackNavigator<BuyStackParamList>();

export function BuyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={AllocateWorkspaceScreen} name="Workspace" />
    </Stack.Navigator>
  );
}
