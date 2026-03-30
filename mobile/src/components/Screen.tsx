import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/theme/palette';

function GlowBlob({
  color,
  height,
  style,
  width,
}: {
  color: string;
  height: number;
  style: StyleProp<ViewStyle>;
  width: number;
}) {
  const gradientId = `glow-${color.replace(/[^a-z0-9]/gi, '')}-${width}-${height}`;

  return (
    <View pointerEvents="none" style={[styles.glowSvg, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.62" />
            <Stop offset="28%" stopColor={color} stopOpacity="0.34" />
            <Stop offset="58%" stopColor={color} stopOpacity="0.14" />
            <Stop offset="82%" stopColor={color} stopOpacity="0.05" />
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
        <GlowBlob color="#FF6A00" height={760} style={styles.glowAmberOuter} width={760} />
        <GlowBlob color="#FF7F2A" height={360} style={styles.glowAmberCore} width={360} />
        <GlowBlob color="#FF6A00" height={720} style={styles.glowBlueOuter} width={720} />
        <GlowBlob color="#FFB066" height={340} style={styles.glowBlueCore} width={340} />
        <GlowBlob color="#FF7F2A" height={680} style={styles.glowGreenOuter} width={680} />
        <GlowBlob color="#FFB066" height={320} style={styles.glowGreenCore} width={320} />
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
    top: -30,
    left: 18,
    width: 360,
    height: 360,
  },
  glowBlueOuter: {
    top: -180,
    right: -320,
    width: 720,
    height: 720,
  },
  glowBlueCore: {
    top: 34,
    right: 42,
    width: 340,
    height: 340,
  },
  glowGreenOuter: {
    bottom: -300,
    left: -260,
    width: 680,
    height: 680,
  },
  glowGreenCore: {
    bottom: 8,
    left: 28,
    width: 320,
    height: 320,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
});
