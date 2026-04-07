import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/theme/palette';

function GlowBlob({
  color,
  height,
  focalX = '50%',
  focalY = '50%',
  opacity = 1,
  style,
  width,
}: {
  color: string;
  height: number;
  focalX?: string;
  focalY?: string;
  opacity?: number;
  style: StyleProp<ViewStyle>;
  width: number;
}) {
  const gradientId = `glow-${color.replace(/[^a-z0-9]/gi, '')}-${width}-${height}`;

  return (
    <View pointerEvents="none" style={[styles.glowSvg, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} opacity={opacity}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%" fx={focalX} fy={focalY}>
            <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <Stop offset="32%" stopColor={color} stopOpacity="0.24" />
            <Stop offset="64%" stopColor={color} stopOpacity="0.08" />
            <Stop offset="84%" stopColor={color} stopOpacity="0.03" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="transparent" />
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

export function Screen({ children, scrollable = true }: PropsWithChildren<{ scrollable?: boolean }>) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <GlowBlob color="#FF6A00" focalX="24%" focalY="20%" height={760} opacity={0.9} style={styles.glowAmberOuter} width={760} />
        <GlowBlob color="#D85C00" focalX="58%" focalY="42%" height={360} opacity={0.68} style={styles.glowAmberCore} width={360} />
        <GlowBlob color="#FF6A00" focalX="74%" focalY="18%" height={720} opacity={0.46} style={styles.glowBlueOuter} width={720} />
        <GlowBlob color="#D85C00" focalX="70%" focalY="30%" height={320} opacity={0.36} style={styles.glowBlueCore} width={320} />
        <GlowBlob color="#FF7F2A" focalX="30%" focalY="74%" height={680} opacity={0.36} style={styles.glowGreenOuter} width={680} />
        <GlowBlob color="#D85C00" focalX="52%" focalY="52%" height={280} opacity={0.26} style={styles.glowGreenCore} width={280} />
        <View style={styles.vignetteTop} />
        <View style={styles.vignetteBottom} />
      </View>
      {scrollable ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  scroll: { padding: 18, gap: 18, paddingBottom: 120 },
  content: { gap: 18, padding: 18, paddingBottom: 120 },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.background,
  },
  glowSvg: {
    position: 'absolute',
  },
  glowAmberOuter: {
    top: -340,
    left: -330,
    width: 760,
    height: 760,
  },
  glowAmberCore: {
    top: -24,
    left: 32,
    width: 360,
    height: 360,
  },
  glowBlueOuter: {
    top: -220,
    right: -340,
    width: 720,
    height: 720,
  },
  glowBlueCore: {
    top: 28,
    right: 56,
    width: 320,
    height: 320,
  },
  glowGreenOuter: {
    bottom: -320,
    left: -240,
    width: 680,
    height: 680,
  },
  glowGreenCore: {
    bottom: 18,
    left: 34,
    width: 280,
    height: 280,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
