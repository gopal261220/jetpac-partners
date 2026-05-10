import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}>;

export function ScreenContainer({
  children,
  leftAction,
  rightAction,
  subtitle,
  title,
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {leftAction ? <View>{leftAction}</View> : null}
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightAction ? <View>{rightAction}</View> : null}
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: typography.heading,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
    color: colors.textMuted,
  },
});
