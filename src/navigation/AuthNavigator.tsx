import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SignInScreen } from '../features/auth/screens/SignInScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={SignInScreen} name="SignIn" />
      <Stack.Screen component={VerifyOtpScreen} name="VerifyOtp" />
    </Stack.Navigator>
  );
}
