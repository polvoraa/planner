import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { fetchProjects } from '@/lib/api';
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
      <Text style={styles.kicker}>Autenticacao</Text>
      <Text style={styles.title}>Projetos protegidos</Text>
      <Text style={styles.description}>
        Entre com a mesma autenticacao usada na aba de mensagens para acessar tarefas e anotacoes internas.
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
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProjects = useCallback(async () => {
    if (!authState.authenticated) return;
    setIsLoadingProjects(true);
    setErrorMessage('');
    try {
      const payload = await fetchProjects();
      setProjects(payload.projects || []);
    } catch (error: any) {
      setProjects([]);
      setErrorMessage(error.message);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [authState.authenticated]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects]),
  );

  const activeProject = useMemo(
    () => projects.find((project) => project.slug === 'nova-studio') || projects[0] || null,
    [projects],
  );

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

  return (
    <Screen>
      <Card>
        <Text style={styles.kicker}>Projetos internos</Text>
        <Text style={styles.title}>{activeProject?.name || 'Projetos'}</Text>
        <Text style={styles.description}>
          Area reservada para acompanhar tarefas e anotacoes do projeto ativo sem misturar com o restante do app.
        </Text>
        <View style={styles.userRow}>
          <Text style={styles.userChip}>{authState.user?.username || 'Sessao ativa'}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonLabel}>Sair</Text>
          </Pressable>
        </View>
      </Card>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {isLoadingProjects ? (
        <Card>
          <Text style={styles.kicker}>Sincronizando</Text>
          <Text style={styles.description}>
            Aguarde enquanto buscamos os dados compartilhados do workspace.
          </Text>
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        </Card>
      ) : null}

      {!isLoadingProjects && !activeProject ? (
        <Card>
          <Text style={styles.kicker}>Sem projeto</Text>
          <Text style={styles.title}>Nenhum projeto disponivel.</Text>
          <Text style={styles.description}>
            Quando houver dados salvos na API, eles aparecem aqui no mobile e no web.
          </Text>
        </Card>
      ) : null}

      {!isLoadingProjects && activeProject ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Tarefas</Text>
            <View style={styles.list}>
              {activeProject.tasks.map((task: string) => (
                <View key={task} style={styles.listItem}>
                  <Text style={styles.listBullet}>-</Text>
                  <Text style={styles.listText}>{task}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Anotacoes</Text>
            <View style={styles.list}>
              {activeProject.notes.map((note: string) => (
                <View key={note} style={styles.listItem}>
                  <Text style={styles.listBullet}>-</Text>
                  <Text style={styles.listText}>{note}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: palette.secondaryText, textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  sectionTitle: { color: palette.text, fontSize: 22, fontWeight: '700' },
  formGroup: { gap: 12, marginTop: 18 },
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
  button: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.softPanel },
  primaryButton: { backgroundColor: palette.accent },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: palette.text, fontWeight: '700' },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 },
  userChip: { color: palette.text, backgroundColor: palette.softPanel, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  helperText: { color: palette.subtleText, marginTop: 12 },
  errorText: {
    color: palette.text,
    backgroundColor: 'rgba(255, 127, 42, 0.14)',
    padding: 12,
    borderRadius: 14,
  },
  list: { gap: 12, marginTop: 18 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.softPanel,
  },
  listBullet: { color: palette.accent, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  listText: { flex: 1, color: palette.text, fontSize: 15, lineHeight: 22 },
});
