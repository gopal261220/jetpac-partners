import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

import { useAuth } from '../features/auth/context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { colors } from '../theme/colors';
import { AppStackNavigator } from './AppStackNavigator';
import { AuthNavigator } from './AuthNavigator';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  const { isBootstrapping, session } = useAuth();

  if (isBootstrapping) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? <AppStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
