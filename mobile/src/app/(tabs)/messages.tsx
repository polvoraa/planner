import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { fetchResponses, markResponsesRead } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/palette';

type Summary = {
  total: number;
  unreadTotal: number;
  bySource: Record<string, number>;
  unreadBySource: Record<string, number>;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

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
      <Text style={styles.title}>Hub de respostas</Text>
      <Text style={styles.description}>
        Essa area exige autenticacao antes de carregar as mensagens vindas dos formularios.
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

export default function MessagesScreen() {
  const { authState, logout, refreshMessageSummary } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    unreadTotal: 0,
    bySource: {},
    unreadBySource: {},
  });
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingReadId, setPendingReadId] = useState('');

  const loadResponses = useCallback(async () => {
    if (!authState.authenticated) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchResponses({ source: sourceFilter, search, limit: 200 });
      const nextSummary = payload.summary || { total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} };
      setResponses(payload.items || []);
      setSummary(nextSummary);
      refreshMessageSummary(nextSummary);
    } catch (error: any) {
      setResponses([]);
      setSummary({ total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} });
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [authState.authenticated, refreshMessageSummary, search, sourceFilter]);

  useFocusEffect(
    useCallback(() => {
      loadResponses();
    }, [loadResponses]),
  );

  const sourceOptions = Object.keys(summary.bySource || {});

  const handleMarkAsRead = async (id: string, source: string) => {
    setPendingReadId(id);
    try {
      await markResponsesRead([id], true);
      const nextSummary = {
        ...summary,
        unreadTotal: Math.max((summary.unreadTotal || 0) - 1, 0),
        unreadBySource: {
          ...(summary.unreadBySource || {}),
          [source]: Math.max(((summary.unreadBySource || {})[source] || 0) - 1, 0),
        },
      };

      setResponses((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setSummary(nextSummary);
      refreshMessageSummary(nextSummary);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setPendingReadId('');
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

  return (
    <Screen>
      <Card>
        <Text style={styles.kicker}>Mensagens centralizadas</Text>
        <Text style={styles.title}>Hub de respostas</Text>
        <Text style={styles.description}>
          Visualize os envios dos formularios conectados ao mesmo cluster MongoDB e filtre por origem ou texto.
        </Text>
        <View style={styles.userRow}>
          <Text style={styles.userChip}>{authState.user?.username || 'Sessao ativa'}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonLabel}>Sair</Text>
          </Pressable>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total carregado</Text>
            <Text style={styles.metricValue}>{summary.total}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Nao lidas</Text>
            <Text style={styles.metricValue}>{summary.unreadTotal || 0}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadResponses}
          placeholder="Nome, email, mensagem..."
          placeholderTextColor={palette.muted}
        />
        <View style={styles.filtersRow}>
          <View style={styles.chipsWrap}>
            {['Todas', ...sourceOptions].map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, (sourceFilter || 'Todas') === item && styles.chipActive]}
                onPress={() => setSourceFilter(item === 'Todas' ? '' : item)}>
                <Text style={[styles.chipLabel, (sourceFilter || 'Todas') === item && styles.chipLabelActive]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={loadResponses}>
            <Text style={styles.primaryButtonLabel}>Aplicar</Text>
          </Pressable>
        </View>
      </Card>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {isLoading ? (
        <Card>
          <Text style={styles.kicker}>Sincronizando</Text>
          <Text style={styles.description}>
            Aguarde enquanto a API consulta os envios salvos no MongoDB.
          </Text>
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        </Card>
      ) : null}

      {!isLoading && !responses.length ? (
        <Card>
          <Text style={styles.kicker}>Sem resultados</Text>
          <Text style={styles.title}>Nenhuma resposta encontrada.</Text>
          <Text style={styles.description}>
            Ajuste os filtros ou confira se a collection configurada contem documentos.
          </Text>
        </Card>
      ) : null}

      {!isLoading &&
        responses.map((item) => (
          <Card key={item.id} style={[styles.messageCard, !item.isRead && styles.unreadCard]}>
            <View style={styles.messageHead}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.kicker}>{item.source}</Text>
                <Text style={styles.messageTitle}>{item.name}</Text>
              </View>
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{item.email}</Text>
              <Text style={styles.metaText}>Atualizado em {formatDate(item.updatedAt)}</Text>
            </View>
            <Text style={styles.messageBody}>{item.message || 'Mensagem vazia.'}</Text>
            {item.lastWhatsAppError ? (
              <Text style={styles.errorText}>Falha no WhatsApp: {item.lastWhatsAppError}</Text>
            ) : null}
            <View style={styles.actionsRow}>
              <Text style={[styles.statusPill, item.isRead ? styles.readPill : styles.unreadPill]}>
                {item.isRead ? 'Lida' : 'Nao lida'}
              </Text>
              {!item.isRead ? (
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => handleMarkAsRead(item.id, item.source)}
                  disabled={pendingReadId === item.id}>
                  <Text style={styles.primaryButtonLabel}>
                    {pendingReadId === item.id ? 'Salvando...' : 'Marcar como lida'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: palette.secondaryText, textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
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
  primaryButtonLabel: { color: '#111722', fontWeight: '700' },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 },
  userChip: { color: palette.text, backgroundColor: palette.softPanel, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  metricCard: { flex: 1, borderRadius: 18, padding: 16, backgroundColor: palette.softPanel },
  metricLabel: { color: palette.subtleText, fontSize: 13 },
  metricValue: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  filtersRow: { gap: 12, marginTop: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: palette.softPanel },
  chipActive: { backgroundColor: 'rgba(255, 177, 94, 0.2)' },
  chipLabel: { color: palette.subtleText, fontWeight: '600' },
  chipLabelActive: { color: palette.accent },
  errorText: {
    color: '#ffd0c0',
    backgroundColor: 'rgba(255, 124, 84, 0.14)',
    padding: 12,
    borderRadius: 14,
  },
  helperText: { color: palette.subtleText, marginTop: 12 },
  messageCard: { gap: 12 },
  unreadCard: { borderColor: 'rgba(255, 177, 94, 0.4)' },
  messageHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  metaRow: { gap: 6 },
  metaText: { color: palette.subtleText, fontSize: 13, lineHeight: 18 },
  messageTitle: { color: palette.text, fontSize: 24, fontWeight: '700' },
  messageBody: { color: palette.text, fontSize: 15, lineHeight: 24 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  unreadPill: { backgroundColor: 'rgba(255, 177, 94, 0.14)', color: '#ffd4a2' },
  readPill: { backgroundColor: 'rgba(105, 210, 165, 0.14)', color: '#abf1d0' },
});
