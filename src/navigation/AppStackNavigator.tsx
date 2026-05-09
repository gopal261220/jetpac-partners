import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileScreen } from '../screens/ProfileScreen';
import type { AppStackParamList } from './types';
import { AppTabsNavigator } from './AppTabsNavigator';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={AppTabsNavigator} name="MainTabs" options={{ headerShown: false }} />
      <Stack.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          title: 'Profile',
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
