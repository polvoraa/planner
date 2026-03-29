import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/palette';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text style={styles.kicker}>Perfil</Text>
        <Text style={styles.title}>Painel de perfil em construcao.</Text>
        <Text style={styles.description}>
          Esse espaco fica pronto para configuracoes pessoais e preferencias do workspace quando voce
          decidir evoluir essa parte do projeto.
        </Text>
        <Pressable style={styles.button} onPress={() => router.push('/(tabs)/planner')}>
          <Text style={styles.buttonLabel}>Ir para tarefas</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: palette.secondaryText, textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  button: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.accent },
  buttonLabel: { color: '#111722', fontWeight: '700' },
});
