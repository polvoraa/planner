import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { palette } from '@/theme/palette';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.card, style]}>
      <View pointerEvents="none" style={styles.glowWrap}>
        <Svg width={220} height={220} viewBox="0 0 220 220" opacity={0.26}>
          <Defs>
            <RadialGradient id="card-base-glow" cx="50%" cy="50%" rx="50%" ry="50%" fx="72%" fy="22%">
              <Stop offset="0%" stopColor="#D85C00" stopOpacity="0.62" />
              <Stop offset="36%" stopColor="#D85C00" stopOpacity="0.24" />
              <Stop offset="72%" stopColor="#D85C00" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#D85C00" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="110" cy="110" rx="110" ry="110" fill="url(#card-base-glow)" />
        </Svg>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
    gap: 8,
    overflow: 'hidden',
  },
  glowWrap: {
    position: 'absolute',
    top: -54,
    right: -58,
    width: 220,
    height: 220,
  },
  content: {
    gap: 8,
  },
});
