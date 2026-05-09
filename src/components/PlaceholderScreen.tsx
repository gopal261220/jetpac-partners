import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { ScreenContainer } from './ScreenContainer';

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  description: string;
  footer?: ReactNode;
};

export function PlaceholderScreen({
  description,
  footer,
  subtitle,
  title,
}: PlaceholderScreenProps) {
  return (
    <ScreenContainer subtitle={subtitle} title={title}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Screen placeholder</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: colors.surface,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
  },
  cardDescription: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  footer: {
    marginTop: 12,
  },
});
