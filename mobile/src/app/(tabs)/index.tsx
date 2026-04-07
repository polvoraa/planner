import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

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

function CardGlow({
  color,
  focalX = '50%',
  focalY = '50%',
  height,
  opacity = 1,
  width,
}: {
  color: string;
  focalX?: string;
  focalY?: string;
  height: number;
  opacity?: number;
  width: number;
}) {
  const gradientId = `card-glow-${color.replace(/[^a-z0-9]/gi, '')}-${width}-${height}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} opacity={opacity}>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%" fx={focalX} fy={focalY}>
          <Stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <Stop offset="35%" stopColor={color} stopOpacity="0.34" />
          <Stop offset="68%" stopColor={color} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

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
  const nextPending = Math.max(totalTasks - completedTasks, 0);
  const sourceCount = Object.keys(responsesSummary.bySource || {}).length;

  return (
    <Screen>
      <Card style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlow}>
          <CardGlow color="#D85C00" focalX="74%" focalY="22%" height={420} opacity={0.58} width={420} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Workspace central</Text>
          <Text style={styles.title}>Operacao, rotina e mensagens em um painel mais proximo do web.</Text>
          <Text style={styles.description}>
            A home agora prioriza leitura rapida no mobile, com atalhos claros, status do planner e
            visao resumida do hub.
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.primaryButton, styles.actionPrimary]}
              onPress={() => router.push('/(tabs)/planner')}>
              <Text style={styles.primaryButtonLabel}>Abrir planner</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/(tabs)/messages')}>
              <Text style={styles.buttonLabel}>Ver mensagens</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Execucao atual</Text>
            <Text style={styles.metricValue}>{completionRate}%</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Pendencias</Text>
            <Text style={styles.metricValue}>{nextPending}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.metricLabel}>Mensagens novas</Text>
            <Text style={styles.metricValue}>{authState.authenticated ? unreadCount : 0}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.quickGrid}>
        <Card style={[styles.quickCard, styles.featuredCard]}>
          <Text style={styles.kicker}>Planner</Text>
          <Text style={styles.cardTitle}>Rotina diaria</Text>
          <Text style={styles.cardDescription}>
            {plannerDays.length
              ? `${plannerDays.length} dias carregados, ${nextPending} tarefas pendentes e foco no que falta concluir.`
              : 'Crie o dia de hoje e comece a organizar tarefas com menos friccao.'}
          </Text>
          <View style={styles.inlineStats}>
            <Text style={styles.pill}>{plannerDays.length} dias</Text>
            <Text style={styles.pill}>{completedTasks} concluidas</Text>
          </View>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(tabs)/planner')}>
            <Text style={styles.primaryButtonLabel}>Entrar</Text>
          </Pressable>
        </Card>

        <Card style={styles.quickCard}>
          <Text style={styles.kicker}>Mensagens</Text>
          <Text style={styles.cardTitle}>Hub centralizado</Text>
          <Text style={styles.cardDescription}>
            {authState.authenticated
              ? `${unreadCount} nao lidas em ${sourceCount} origens conectadas.`
              : 'Protegido por login. Entre para ver respostas dos formularios.'}
          </Text>
          <View style={styles.inlineStats}>
            <Text style={styles.pill}>{authState.authenticated ? 'Sessao ativa' : 'Acesso restrito'}</Text>
            <Text style={styles.pill}>{authState.authenticated ? `${sourceCount} origens` : 'Login necessario'}</Text>
          </View>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(tabs)/messages')}>
            <Text style={styles.primaryButtonLabel}>Entrar</Text>
          </Pressable>
        </Card>

        <Card style={styles.quickCard}>
          <Text style={styles.kicker}>Financeiro</Text>
          <Text style={styles.cardTitle}>Extratos consolidados</Text>
          <Text style={styles.cardDescription}>
            Importe CSVs de bancos diferentes, consolide os lancamentos e edite a tabela com comandos.
          </Text>
          <View style={styles.inlineStats}>
            <Text style={styles.pill}>Resumo mensal</Text>
            <Text style={styles.pill}>Comando com IA</Text>
          </View>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(tabs)/finance' as any)}>
            <Text style={styles.primaryButtonLabel}>Entrar</Text>
          </Pressable>
        </Card>
      </View>

      <Card style={styles.productivityCard}>
        <Text style={styles.kicker}>Produtividade</Text>
        <Text style={styles.cardTitle}>Ritmo de execucao</Text>
        <Text style={styles.cardDescription}>
          Uma leitura compacta da semana, com a mesma ideia visual do dashboard web mas ajustada para tela menor.
        </Text>
        <View style={styles.chart}>
          {(chartDays.length ? chartDays : fallbackChartDays).map((day, index) => {
            const total = day.tasks?.length || day.total || 0;
            const done = day.tasks?.filter((task: any) => task.done).length || day.done || 0;
            const height = total ? Math.max(18, Math.round((done / total) * 100)) : 18;

            return (
              <View key={`${day.id || day.label}-${index}`} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBarGlow, { height: `${Math.min(height + 14, 100)}%` }]}>
                    <CardGlow color="#D85C00" height={120} opacity={0.4} width={64} />
                  </View>
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
            Reserve este bloco para disparos programados, revisoes e fluxos repetitivos sem poluir a home.
          </Text>
        </Card>
        <Card style={styles.smallCard}>
          <Text style={styles.kicker}>Financeiro</Text>
          <Text style={styles.cardTitle}>Extratos consolidados</Text>
          <Text style={styles.cardDescription}>
            Importacao mensal, filtros, historico de arquivos e ajustes com IA no mesmo fluxo da web.
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
  hero: {
    gap: 24,
    backgroundColor: palette.panelElevated,
    borderColor: palette.borderStrong,
    padding: 24,
  },
  heroGlow: {
    position: 'absolute',
    top: -112,
    right: -120,
    width: 420,
    height: 420,
  },
  heroCopy: { gap: 14 },
  heroPanel: { gap: 12 },
  kicker: {
    color: palette.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: { color: palette.text, fontSize: 36, lineHeight: 37, fontWeight: '800', letterSpacing: -1.8 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, maxWidth: 420 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: palette.softPanel,
  },
  actionPrimary: { minWidth: 146 },
  primaryButton: { backgroundColor: palette.accent },
  secondaryButton: { backgroundColor: palette.softPanelStrong, borderWidth: 1, borderColor: palette.border },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: palette.text, fontWeight: '700' },
  heroMetric: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  metricLabel: { color: palette.subtleText, fontSize: 13 },
  metricValue: { color: palette.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  quickGrid: { gap: 16 },
  quickCard: { gap: 18 },
  featuredCard: { borderColor: palette.borderStrong, backgroundColor: palette.panelElevated },
  cardTitle: { color: palette.text, fontSize: 26, fontWeight: '700', marginTop: 10 },
  cardDescription: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, marginBottom: 16 },
  statText: { color: palette.subtleText, fontSize: 13 },
  inlineStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.softPanelStrong,
    color: palette.text,
    fontSize: 12,
    fontWeight: '600',
  },
  productivityCard: { gap: 18 },
  chart: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'flex-end', minHeight: 200 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 8 },
  chartTrack: {
    width: '100%',
    minHeight: 140,
    borderRadius: 22,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'flex-end',
    padding: 8,
    overflow: 'hidden',
  },
  chartBarGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: -12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: palette.accent,
    minHeight: 18,
  },
  chartStrong: { color: palette.text, fontWeight: '700' },
  chartSmall: { color: palette.subtleText, fontSize: 12 },
  grid: { gap: 16 },
  smallCard: { minHeight: 150, gap: 14 },
});
