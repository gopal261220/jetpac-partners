import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/features/auth/context/AuthContext';
import { BuyFlowProvider } from './src/features/buy/context/BuyFlowContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BuyFlowProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </BuyFlowProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
