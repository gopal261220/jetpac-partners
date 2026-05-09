import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/features/auth/context/AuthContext';
import { BuyCartProvider } from './src/features/buy/context/BuyCartContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BuyCartProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </BuyCartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
