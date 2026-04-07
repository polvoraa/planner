import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  applyProjectAiCommand,
  createProject,
  createProjectNote,
  createProjectTask,
  deleteProject,
  deleteProjectNote,
  deleteProjectTask,
  fetchProjects,
  previewProjectAiCommand,
  updateProjectTask,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { palette } from '@/theme/palette';

function LoginCard() {
  const { login, authState, authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');
    try {
      await login(username, password);
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  return (
    <Card>
      <Text style={styles.kicker}>Acesso restrito</Text>
      <Text style={styles.title}>Entre para abrir a area de projetos.</Text>
      <Text style={styles.description}>
        Essa area usa a mesma autenticacao da aba de mensagens para liberar tarefas e anotacoes internas.
      </Text>
      <View style={styles.formGroup}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Usuario"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={palette.muted}
          secureTextEntry
        />
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSubmit} disabled={authLoading}>
          <Text style={styles.primaryButtonLabel}>{authLoading ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>
      </View>
      {authState.user ? <Text style={styles.helperText}>Sessao ativa: {authState.user.username}</Text> : null}
    </Card>
  );
}

export default function ProjectsScreen() {
  const { authState, logout } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [draftProject, setDraftProject] = useState('');
  const [draftTask, setDraftTask] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [aiCommand, setAiCommand] = useState('');
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const syncProjects = useCallback((payload: any) => {
    const nextProjects = payload.workspace?.projects || payload.projects || [];
    setProjects(nextProjects);
    setSelectedProjectId((current) => {
      if (nextProjects.some((project: any) => project.id === current)) {
        return current;
      }

      return nextProjects.find((project: any) => project.slug === 'nova-studio')?.id ?? nextProjects[0]?.id ?? '';
    });
  }, []);

  const loadProjects = useCallback(async () => {
    if (!authState.authenticated) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchProjects();
      syncProjects(payload);
    } catch (error: any) {
      setProjects([]);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [authState.authenticated, syncProjects]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects]),
  );

  const activeProject = useMemo(
    () =>
      projects.find((project) => project.id === selectedProjectId) ??
      projects.find((project) => project.slug === 'nova-studio') ??
      projects[0] ??
      null,
    [projects, selectedProjectId],
  );

  const completedTasks = activeProject?.tasks.filter((task: any) => task.done).length ?? 0;
  const pendingTasks = (activeProject?.tasks.length ?? 0) - completedTasks;
  const isBusy = isSaving || isAiLoading || isApplyingAi;

  const runMutation = async (
    operation: () => Promise<any>,
    options?: { selectProjectId?: (payload: any) => string },
  ) => {
    setIsSaving(true);
    setErrorMessage('');
    setAiMessage('');
    try {
      const payload = await operation();
      syncProjects(payload);
      if (options?.selectProjectId) {
        const nextProjectId = options.selectProjectId(payload);
        if (nextProjectId) {
          setSelectedProjectId(nextProjectId);
        }
      }
      return payload;
    } catch (error: any) {
      setErrorMessage(error.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProject = async () => {
    const name = draftProject.trim();
    if (!name) {
      return;
    }

    const payload = await runMutation(() => createProject(name), {
      selectProjectId: (result) => result.projectId,
    });

    if (payload) {
      setDraftProject('');
    }
  };

  const handleAddTask = async () => {
    const text = draftTask.trim();
    if (!text || !activeProject?.id) {
      return;
    }

    const payload = await runMutation(() => createProjectTask(activeProject.id, text));
    if (payload) {
      setDraftTask('');
    }
  };

  const handleAddNote = async () => {
    const text = draftNote.trim();
    if (!text || !activeProject?.id) {
      return;
    }

    const payload = await runMutation(() => createProjectNote(activeProject.id, text));
    if (payload) {
      setDraftNote('');
    }
  };

  const handleGenerateAiPreview = async () => {
    const command = aiCommand.trim();
    if (!command || !activeProject?.id) {
      return;
    }

    setIsAiLoading(true);
    setErrorMessage('');
    setAiMessage('');
    try {
      const payload = await previewProjectAiCommand({
        command,
        currentProjectId: activeProject.id,
      });
      setAiPreview(payload);
    } catch (error: any) {
      setAiPreview(null);
      setErrorMessage(error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiPreview = async () => {
    if (!aiPreview) {
      return;
    }

    setIsApplyingAi(true);
    setErrorMessage('');
    setAiMessage('');
    try {
      const payload = await applyProjectAiCommand(aiPreview);
      syncProjects(payload);

      if (payload.applied?.targetProject?.id) {
        setSelectedProjectId(payload.applied.targetProject.id);
      }

      const created = payload.applied?.created || {};
      const createdCount =
        (created.projectTasks || 0) +
        (created.projectNotes || 0) +
        (created.dailyNotes || 0);

      setAiPreview(null);
      setAiCommand('');
      setAiMessage(
        createdCount
          ? `IA aplicada com ${createdCount} item(ns) criado(s).`
          : 'Nenhum item novo foi aplicado.',
      );
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsApplyingAi(false);
    }
  };

  if (!authState.checked || authState.loading) {
    return (
      <Screen>
        <Card>
          <Text style={styles.kicker}>Autenticacao</Text>
          <Text style={styles.title}>Validando sessao...</Text>
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        </Card>
      </Screen>
    );
  }

  if (!authState.authenticated) {
    return (
      <Screen>
        <LoginCard />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <Card>
          <Text style={styles.kicker}>Sincronizando</Text>
          <Text style={styles.title}>Carregando projetos...</Text>
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.kicker}>Projetos internos</Text>
        <Text style={styles.title}>{activeProject?.name || 'Projetos'}</Text>
        <Text style={styles.description}>
          Selecione um projeto, adicione tarefas e mantenha uma lista separada de anotacoes.
        </Text>
        <View style={styles.userRow}>
          <Text style={styles.userChip}>{authState.user?.username || 'Sessao ativa'}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonLabel}>Sair</Text>
          </Pressable>
        </View>
      </Card>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {aiMessage ? <Text style={styles.successText}>{aiMessage}</Text> : null}

      <Card>
        <Text style={styles.kicker}>Adicionar projeto</Text>
        <View style={styles.formRow}>
          <TextInput
            style={styles.input}
            value={draftProject}
            onChangeText={setDraftProject}
            placeholder="Adicionar projeto"
            placeholderTextColor={palette.muted}
          />
          <Pressable style={[styles.button, styles.primaryButton]} onPress={handleCreateProject} disabled={isBusy}>
            <Text style={styles.primaryButtonLabel}>{isSaving ? 'Salvando...' : 'Adicionar'}</Text>
          </Pressable>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayList}>
        {projects.map((project) => (
          <Pressable
            key={project.id}
            style={[styles.dayChip, project.id === activeProject?.id && styles.dayChipActive]}
            onPress={() => setSelectedProjectId(project.id)}>
            <Text style={[styles.dayChipTitle, project.id === activeProject?.id && styles.dayChipTitleActive]}>
              {project.name}
            </Text>
            <Text style={[styles.dayChipDate, project.id === activeProject?.id && styles.dayChipTitleActive]}>
              {project.tasks.length} tarefas
            </Text>
            <Text style={[styles.dayChipMeta, project.id === activeProject?.id && styles.dayChipTitleActive]}>
              {project.notes.length} notas
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!activeProject ? (
        <Card>
          <Text style={styles.kicker}>Sem projeto</Text>
          <Text style={styles.title}>Nenhum projeto disponivel.</Text>
          <Text style={styles.description}>Crie um projeto para liberar tarefas e anotacoes compartilhadas.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={styles.kicker}>Projeto selecionado</Text>
            <Text style={styles.title}>{activeProject.name}</Text>
            <Text style={styles.description}>Tarefas compartilhadas com checkbox e anotacoes simples em lista.</Text>
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
            <Text style={styles.kicker}>Assistente com IA</Text>
            <Text style={styles.panelTitle}>Comando natural para {activeProject.name}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={aiCommand}
              onChangeText={setAiCommand}
              placeholder="Ex.: adiciona fazer posts, conseguir clientes e revisar proposta no Nova Studio"
              placeholderTextColor={palette.muted}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleGenerateAiPreview}
              disabled={isBusy || !aiCommand.trim()}>
              <Text style={styles.primaryButtonLabel}>{isAiLoading ? 'Analisando...' : 'Analisar com IA'}</Text>
            </Pressable>

            {aiPreview ? (
              <View style={styles.previewList}>
                <View style={styles.previewHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>Preview</Text>
                    <Text style={styles.previewTitle}>
                      {aiPreview.targetProject?.name
                        ? `Destino principal: ${aiPreview.targetProject.name}`
                        : 'Sem projeto definido'}
                    </Text>
                  </View>
                  <Text style={styles.tag}>Groq</Text>
                </View>

                {(aiPreview.actions || []).map((action: any, index: number) => (
                  <View key={`${action.type}-${index}-${action.text}`} style={styles.previewItem}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.previewItemTitle}>{formatAiActionLabel(action.type)}</Text>
                      <Text style={styles.metaText}>{action.text}</Text>
                    </View>
                    <Text style={styles.metaText}>{formatAiDestination(action)}</Text>
                  </View>
                ))}

                {aiPreview.warnings?.length ? (
                  <View style={styles.warningBox}>
                    {aiPreview.warnings.map((warning: string) => (
                      <Text key={warning} style={styles.metaText}>
                        {warning}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.formRow}>
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleApplyAiPreview}
                    disabled={isBusy || !hasApplicableAiAction(aiPreview)}>
                    <Text style={styles.primaryButtonLabel}>
                      {isApplyingAi ? 'Aplicando...' : 'Aplicar sugestoes'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={() => setAiPreview(null)} disabled={isBusy}>
                    <Text style={styles.buttonLabel}>Limpar preview</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Card>

          <Card>
            <View style={styles.panelHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Lista de tarefas</Text>
                <Text style={styles.panelTitle}>{activeProject.name}</Text>
              </View>
              <Pressable
                style={styles.menuButton}
                onPress={() => setIsProjectPanelOpen(true)}
                accessibilityLabel="Abrir painel do projeto">
                <View style={styles.menuDot} />
                <View style={styles.menuDot} />
                <View style={styles.menuDot} />
              </Pressable>
            </View>
            <View style={styles.formRow}>
              <TextInput
                style={styles.input}
                value={draftTask}
                onChangeText={setDraftTask}
                placeholder="Adicionar tarefa"
                placeholderTextColor={palette.muted}
              />
              <Pressable style={[styles.button, styles.primaryButton]} onPress={handleAddTask} disabled={isBusy}>
                <Text style={styles.primaryButtonLabel}>{isSaving ? 'Salvando...' : 'Adicionar'}</Text>
              </Pressable>
            </View>

            <View style={styles.taskList}>
              {activeProject.tasks.map((task: any) => (
                <View key={task.id} style={[styles.taskItem, task.done && styles.taskItemDone]}>
                  <View style={styles.taskLeft}>
                    <Switch
                      value={task.done}
                      onValueChange={(value) => runMutation(() => updateProjectTask(activeProject.id, task.id, value))}
                      trackColor={{ false: palette.softPanel, true: palette.accent }}
                      thumbColor={palette.text}
                    />
                    <Text style={[styles.taskText, task.done && styles.taskTextDone]}>{task.text}</Text>
                  </View>
                  <Pressable onPress={() => runMutation(() => deleteProjectTask(activeProject.id, task.id))}>
                    <Text style={styles.removeText}>Remover</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.kicker}>Lista de anotacoes</Text>
            <Text style={styles.panelTitle}>{activeProject.name}</Text>
            <View style={styles.formRow}>
              <TextInput
                style={styles.input}
                value={draftNote}
                onChangeText={setDraftNote}
                placeholder="Adicionar anotacao"
                placeholderTextColor={palette.muted}
              />
              <Pressable style={[styles.button, styles.primaryButton]} onPress={handleAddNote} disabled={isBusy}>
                <Text style={styles.primaryButtonLabel}>{isSaving ? 'Salvando...' : 'Adicionar'}</Text>
              </Pressable>
            </View>

            <View style={styles.taskList}>
              {activeProject.notes.map((note: any) => (
                <View key={note.id} style={styles.noteItem}>
                  <Text style={styles.taskText}>{note.text}</Text>
                  <Pressable onPress={() => runMutation(() => deleteProjectNote(activeProject.id, note.id))}>
                    <Text style={styles.removeText}>Remover</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {activeProject ? (
        <Modal
          visible={isProjectPanelOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsProjectPanelOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsProjectPanelOpen(false)} />
            <View style={styles.modalSheet}>
              <Card>
                <View style={styles.modalTopBar}>
                  <Text style={styles.kicker}>Atalhos do projeto</Text>
                  <Pressable style={styles.closeButton} onPress={() => setIsProjectPanelOpen(false)}>
                    <Text style={styles.buttonLabel}>Fechar</Text>
                  </Pressable>
                </View>
                <Text style={styles.title}>{activeProject.name}</Text>
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
                <Pressable
                  style={[styles.button, styles.deleteButton]}
                  onPress={async () => {
                    const payload = await runMutation(() => deleteProject(activeProject.id));
                    if (payload) {
                      setIsProjectPanelOpen(false);
                    }
                  }}>
                  <Text style={styles.buttonLabel}>Remover projeto</Text>
                </Pressable>
              </Card>
            </View>
          </View>
        </Modal>
      ) : null}
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
  formGroup: { gap: 12, marginTop: 18 },
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
  textArea: { minHeight: 108 },
  button: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.softPanel },
  primaryButton: { backgroundColor: palette.accent },
  deleteButton: { marginTop: 18 },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: palette.text, fontWeight: '700' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 },
  userChip: {
    color: palette.text,
    backgroundColor: palette.softPanel,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  helperText: { color: palette.subtleText, marginTop: 12 },
  errorText: {
    color: palette.text,
    backgroundColor: 'rgba(255, 127, 42, 0.14)',
    padding: 12,
    borderRadius: 14,
  },
  successText: {
    color: palette.text,
    backgroundColor: 'rgba(98, 214, 145, 0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(122, 222, 161, 0.24)',
  },
  dayList: { gap: 12, paddingRight: 8 },
  dayChip: {
    width: 180,
    borderRadius: 20,
    padding: 16,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  dayChipActive: { borderColor: palette.accent, backgroundColor: palette.softPanelStrong },
  dayChipTitle: { color: palette.text, fontSize: 17, fontWeight: '700' },
  dayChipDate: { color: palette.subtleText, fontSize: 13 },
  dayChipMeta: { color: palette.secondaryText, fontSize: 12 },
  dayChipTitleActive: { color: palette.accent },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  statBox: { flex: 1, borderRadius: 18, padding: 16, backgroundColor: palette.softPanel },
  statLabel: { color: palette.subtleText, fontSize: 13 },
  statValue: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  menuButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.softPanel,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  menuDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.text,
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
  noteItem: {
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
  removeText: { color: palette.danger, fontWeight: '700' },
  previewList: { gap: 12, marginTop: 16 },
  previewHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  previewTitle: { color: palette.text, fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 6 },
  previewItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  previewItemTitle: { color: palette.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  metaText: { color: palette.subtleText, fontSize: 13, lineHeight: 18 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.softPanel,
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  warningBox: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 107, 0.18)',
    backgroundColor: 'rgba(255, 175, 87, 0.08)',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: 16,
    paddingBottom: 32,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.softPanel,
  },
});

const formatAiActionLabel = (type: string) => {
  switch (type) {
    case 'project_task':
      return 'Tarefa do projeto';
    case 'project_note':
      return 'Anotacao do projeto';
    case 'daily_task':
      return 'Tarefa do dia';
    case 'personal_note':
      return 'Item pessoal';
    default:
      return 'Sugestao';
  }
};

const formatAiDestination = (action: any) => {
  if (action.destination === 'project') {
    return action.projectName || 'Projeto';
  }

  if (action.destination === 'daily') {
    return action.destinationLabel || 'Nota do dia de hoje';
  }

  return action.reason || 'Nao sera aplicado';
};

const hasApplicableAiAction = (preview: any) =>
  (preview?.actions || []).some((action: any) => action.destination === 'project' || action.destination === 'daily');
