import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  createDay,
  createTask,
  deleteDay,
  deleteTask,
  fetchDays,
  openTodayDay,
  updateTask,
} from '@/lib/api';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/palette';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PlannerScreen() {
  const [days, setDays] = useState<any[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [draftTask, setDraftTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const syncDays = useCallback((payload: any) => {
    const nextDays = payload.board?.days || payload.days || [];
    setDays(nextDays);
    setSelectedDayId((current) => nextDays.find((day: any) => day.id === current)?.id ?? nextDays[0]?.id ?? '');
  }, []);

  const loadPlanner = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchDays();
      syncDays(payload);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [syncDays]);

  useFocusEffect(
    useCallback(() => {
      loadPlanner();
    }, [loadPlanner]),
  );

  const activeDay = useMemo(
    () => days.find((day) => day.id === selectedDayId) ?? days[0] ?? null,
    [days, selectedDayId],
  );
  const completedTasks = activeDay?.tasks.filter((task: any) => task.done).length ?? 0;
  const pendingTasks = (activeDay?.tasks.length ?? 0) - completedTasks;

  const runMutation = async (
    operation: () => Promise<any>,
    options?: { selectDayId?: (payload: any) => string },
  ) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const payload = await operation();
      syncDays(payload);
      if (options?.selectDayId) {
        const nextDayId = options.selectDayId(payload);
        if (nextDayId) {
          setSelectedDayId(nextDayId);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDay = async () => {
    const datedDays = days
      .map((day) => day.dateKey)
      .filter(Boolean)
      .map((dateKey) => new Date(`${dateKey}T12:00:00`))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime());

    const baseDate = datedDays[0] || new Date();
    const nextDateKey = formatDateKey(new Date(baseDate.getTime() + DAY_IN_MS));

    await runMutation(() => createDay(nextDateKey), {
      selectDayId: (payload) => payload.dayId,
    });
  };

  const handleAddTask = async () => {
    const text = draftTask.trim();
    if (!text || !activeDay?.id) {
      return;
    }

    await runMutation(() => createTask(activeDay.id, text));
    setDraftTask('');
  };

  if (isLoading) {
    return (
      <Screen>
        <Card>
          <Text style={styles.kicker}>Sincronizando</Text>
          <Text style={styles.title}>Carregando planner...</Text>
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        </Card>
      </Screen>
    );
  }

  if (!activeDay) {
    return (
      <Screen>
        <Card>
          <Text style={styles.kicker}>Planner vazio</Text>
          <Text style={styles.title}>Nenhum dia disponivel.</Text>
          <Text style={styles.description}>
            Verifique a conexao com a API ou reinicie a sincronizacao.
          </Text>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={loadPlanner}>
            <Text style={styles.primaryButtonLabel}>Tentar novamente</Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.kicker}>Planejamento diario</Text>
        <Text style={styles.title}>Tarefas por dia</Text>
        <Text style={styles.description}>
          Selecione um dia, adicione tarefas e acompanhe seu ritmo.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() =>
              runMutation(() => openTodayDay(), {
                selectDayId: (payload) => payload.dayId,
              })
            }>
            <Text style={styles.primaryButtonLabel}>
              {isSaving ? 'Salvando...' : 'Abrir nota de hoje'}
            </Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleAddDay}>
            <Text style={styles.buttonLabel}>Novo dia</Text>
          </Pressable>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayList}>
        {days.map((day) => {
          const doneCount = day.tasks.filter((task: any) => task.done).length;
          return (
            <Pressable
              key={day.id}
              style={[styles.dayChip, day.id === activeDay.id && styles.dayChipActive]}
              onPress={() => setSelectedDayId(day.id)}>
              <Text style={[styles.dayChipTitle, day.id === activeDay.id && styles.dayChipTitleActive]}>
                {day.label}
              </Text>
              <Text style={[styles.dayChipDate, day.id === activeDay.id && styles.dayChipTitleActive]}>
                {day.date}
              </Text>
              <Text style={[styles.dayChipMeta, day.id === activeDay.id && styles.dayChipTitleActive]}>
                {doneCount} feitas
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card>
        <Text style={styles.kicker}>Dia selecionado</Text>
        <Text style={styles.title}>{activeDay.label}</Text>
        <Text style={styles.description}>{activeDay.note}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Concluidas</Text>
            <Text style={styles.statValue}>{completedTasks}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pendentes</Text>
            <Text style={styles.statValue}>{pendingTasks}</Text>
          </View>
        </View>
      </Card>

      <Card>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Text style={styles.kicker}>Lista do dia</Text>
        <Text style={styles.panelTitle}>{activeDay.date}</Text>

        <View style={styles.formRow}>
          <TextInput
            style={styles.input}
            value={draftTask}
            onChangeText={setDraftTask}
            placeholder="Adicionar tarefa"
            placeholderTextColor={palette.muted}
          />
          <Pressable style={[styles.button, styles.primaryButton]} onPress={handleAddTask}>
            <Text style={styles.primaryButtonLabel}>Adicionar</Text>
          </Pressable>
        </View>

        <View style={styles.taskList}>
          {activeDay.tasks.map((task: any) => (
            <View key={task.id} style={[styles.taskItem, task.done && styles.taskItemDone]}>
              <View style={styles.taskLeft}>
                <Switch
                  value={task.done}
                  onValueChange={(value) => runMutation(() => updateTask(activeDay.id, task.id, value))}
                  trackColor={{ false: palette.softPanel, true: palette.accent }}
                  thumbColor="#ffffff"
                />
                <Text style={[styles.taskText, task.done && styles.taskTextDone]}>{task.text}</Text>
              </View>
              <Pressable onPress={() => runMutation(() => deleteTask(activeDay.id, task.id))}>
                <Text style={styles.removeText}>Remover</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.button, styles.deleteButton]}
          onPress={() => runMutation(() => deleteDay(activeDay.id))}>
          <Text style={styles.buttonLabel}>Remover dia</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: palette.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  panelTitle: { color: palette.text, fontSize: 24, fontWeight: '700', marginTop: 10 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  button: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.softPanel },
  primaryButton: { backgroundColor: palette.accent },
  deleteButton: { marginTop: 18 },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: '#111722', fontWeight: '700' },
  dayList: { gap: 12, paddingRight: 8 },
  dayChip: {
    width: 156,
    borderRadius: 20,
    padding: 16,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  dayChipActive: { borderColor: 'rgba(255, 177, 94, 0.45)', backgroundColor: palette.softPanel },
  dayChipTitle: { color: palette.text, fontSize: 17, fontWeight: '700' },
  dayChipDate: { color: palette.subtleText, fontSize: 13 },
  dayChipMeta: { color: palette.secondaryText, fontSize: 12 },
  dayChipTitleActive: { color: palette.accent },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  statBox: { flex: 1, borderRadius: 18, padding: 16, backgroundColor: palette.softPanel },
  statLabel: { color: palette.subtleText, fontSize: 13 },
  statValue: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  formRow: { gap: 12, marginTop: 16 },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.softPanel,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  taskList: { gap: 12, marginTop: 18 },
  taskItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  taskItemDone: { opacity: 0.72 },
  taskLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  taskText: { color: palette.text, flex: 1, fontSize: 15, lineHeight: 22 },
  taskTextDone: { textDecorationLine: 'line-through', color: palette.subtleText },
  removeText: { color: '#ff9470', fontWeight: '700' },
  errorText: {
    marginBottom: 14,
    color: '#ffd0c0',
    backgroundColor: 'rgba(255, 124, 84, 0.14)',
    padding: 12,
    borderRadius: 14,
  },
});
