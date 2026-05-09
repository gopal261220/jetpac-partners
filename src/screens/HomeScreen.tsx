import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { PrimaryButton } from '../components/PrimaryButton';
import type { AppTabScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';

export function HomeScreen({ navigation }: AppTabScreenProps<'Home'>) {
  return (
    <PlaceholderScreen
      description="This is the starting point after login. We can now build the real kiosk dashboard here."
      subtitle="Signed-in landing tab"
      title="Home"
      footer={
        <View style={styles.actions}>
          <PrimaryButton label="Open profile route" onPress={() => navigation.navigate('Profile')} />
          <Text style={styles.helperText}>
            This button demonstrates stack navigation on top of the bottom tabs.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
