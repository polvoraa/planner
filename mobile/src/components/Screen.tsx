import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/theme/palette';

export function Screen({ children, scrollable = true }: PropsWithChildren<{ scrollable?: boolean }>) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbRight} />
      <View style={styles.backgroundOrbBottom} />
      {scrollable ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  scroll: { padding: 18, gap: 16, paddingBottom: 120 },
  content: { gap: 16, padding: 18, paddingBottom: 120 },
  backgroundOrbTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(247, 178, 103, 0.14)',
  },
  backgroundOrbRight: {
    position: 'absolute',
    top: 40,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(91, 147, 255, 0.12)',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    bottom: -70,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(90, 201, 165, 0.1)',
  },
});
