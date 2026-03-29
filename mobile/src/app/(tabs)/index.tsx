import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { fetchDays } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { palette } from '@/theme/palette';

const fallbackChartDays = [
  { label: 'Seg', done: 2, total: 4 },
  { label: 'Ter', done: 3, total: 5 },
  { label: 'Qua', done: 4, total: 6 },
  { label: 'Qui', done: 3, total: 4 },
  { label: 'Sex', done: 5, total: 6 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { authState, unreadCount, responsesSummary, refreshMessageSummary } = useAuth();
  const [plannerDays, setPlannerDays] = useState<any[]>([]);

  const loadPreview = useCallback(async () => {
    try {
      const payload = await fetchDays();
      setPlannerDays(payload.days || []);
    } catch {
      setPlannerDays([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreview();
      refreshMessageSummary();
    }, [loadPreview, refreshMessageSummary]),
  );

  const totalTasks = useMemo(
    () => plannerDays.reduce((total, day) => total + day.tasks.length, 0),
    [plannerDays],
  );
  const completedTasks = useMemo(
    () =>
      plannerDays.reduce(
        (total, day) => total + day.tasks.filter((task: any) => task.done).length,
        0,
      ),
    [plannerDays],
  );
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const chartDays = plannerDays.slice(0, 5);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Workspace central</Text>
          <Text style={styles.title}>Um painel unico para operacao, rotina e acompanhamento.</Text>
          <Text style={styles.description}>
            O planner agora vira uma aba dentro de um dashboard principal. As outras areas ja ficam
            desenhadas como proximas entregas para voce expandir depois.
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/(tabs)/planner')}>
              <Text style={styles.primaryButtonLabel}>Abrir planner</Text>
            </Pressable>
            <Pressable style={styles.button}>
              <Text style={styles.buttonLabel}>Personalizar dashboard</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metrics}>
          <Card>
            <Text style={styles.metricLabel}>Execucao atual</Text>
            <Text style={styles.metricValue}>{completionRate}%</Text>
          </Card>
          <Card>
            <Text style={styles.metricLabel}>Tarefas concluidas</Text>
            <Text style={styles.metricValue}>{completedTasks}</Text>
          </Card>
          <Card>
            <Text style={styles.metricLabel}>Total monitorado</Text>
            <Text style={styles.metricValue}>{totalTasks}</Text>
          </Card>
        </View>
      </View>

      <Card style={styles.featuredCard}>
        <Text style={styles.kicker}>Planner</Text>
        <Text style={styles.cardTitle}>Tarefas por dia</Text>
        <Text style={styles.cardDescription}>
          Controle diario com notas por data, criacao automatica da nota de hoje e remocao de dias.
        </Text>
        <View style={styles.cardStats}>
          <Text style={styles.statText}>{plannerDays.length} dias carregados</Text>
          <Text style={styles.statText}>{Math.max(totalTasks - completedTasks, 0)} pendentes</Text>
        </View>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/(tabs)/planner')}>
          <Text style={styles.primaryButtonLabel}>Entrar</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.kicker}>Mensagens</Text>
        <Text style={styles.cardTitle}>Hub de respostas</Text>
        <Text style={styles.cardDescription}>
          Central para respostas de formularios dos seus sites, com filtros por origem, prioridade e
          status de atendimento.
        </Text>
        <View style={styles.cardStats}>
          <Text style={styles.statText}>
            {authState.authenticated ? `${unreadCount} nao lidas` : 'Acesso protegido'}
          </Text>
          <Text style={styles.statText}>
            {authState.authenticated
              ? `${Object.keys(responsesSummary.bySource || {}).length} origens`
              : 'Login necessario'}
          </Text>
        </View>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/(tabs)/messages')}>
          <Text style={styles.primaryButtonLabel}>Entrar</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.kicker}>Produtividade</Text>
        <Text style={styles.cardTitle}>Ritmo de execucao</Text>
        <View style={styles.chart}>
          {(chartDays.length ? chartDays : fallbackChartDays).map((day, index) => {
            const total = day.tasks?.length || day.total || 0;
            const done = day.tasks?.filter((task: any) => task.done).length || day.done || 0;
            const height = total ? Math.max(18, Math.round((done / total) * 100)) : 18;

            return (
              <View key={`${day.id || day.label}-${index}`} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { height: `${height}%` }]} />
                </View>
                <Text style={styles.chartStrong}>{done}</Text>
                <Text style={styles.chartSmall}>{day.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Text style={styles.kicker}>Automacoes</Text>
          <Text style={styles.cardTitle}>Fila de rotina</Text>
          <Text style={styles.cardDescription}>
            Espaco para disparos programados, revisoes pendentes e tarefas repetitivas que voce quiser
            consolidar depois.
          </Text>
        </Card>
        <Card style={styles.smallCard}>
          <Text style={styles.kicker}>Financeiro</Text>
          <Text style={styles.cardTitle}>Resumo operacional</Text>
          <Text style={styles.cardDescription}>
            Cards de faturamento, metas mensais e alertas de contratos podem entrar aqui quando essa
            area existir.
          </Text>
        </Card>
        <Card style={styles.smallCard}>
          <Text style={styles.kicker}>Agenda</Text>
          <Text style={styles.cardTitle}>Proximos checkpoints</Text>
          <Text style={styles.cardDescription}>
            Review semanal do planner, consolidacao do hub e painel de produtividade.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 16 },
  heroCopy: { gap: 14 },
  kicker: {
    color: palette.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: { color: palette.text, fontSize: 34, lineHeight: 36, fontWeight: '800' },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: palette.softPanel,
  },
  primaryButton: { backgroundColor: palette.accent },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: '#111722', fontWeight: '700' },
  metrics: { gap: 12 },
  metricLabel: { color: palette.subtleText, fontSize: 13 },
  metricValue: { color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  featuredCard: { borderColor: 'rgba(91, 147, 255, 0.28)' },
  cardTitle: { color: palette.text, fontSize: 26, fontWeight: '700', marginTop: 10 },
  cardDescription: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, marginBottom: 16 },
  statText: { color: palette.subtleText, fontSize: 13 },
  chart: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'flex-end', minHeight: 200 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 8 },
  chartTrack: {
    width: '100%',
    minHeight: 128,
    borderRadius: 20,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'flex-end',
    padding: 8,
  },
  chartBar: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: palette.accent,
    minHeight: 18,
  },
  chartStrong: { color: palette.text, fontWeight: '700' },
  chartSmall: { color: palette.subtleText, fontSize: 12 },
  grid: { gap: 16 },
  smallCard: { minHeight: 150 },
});
