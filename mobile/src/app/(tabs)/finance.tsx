import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  applyFinanceCommand,
  deleteFinanceImport,
  fetchFinanceWorkspace,
  importFinanceCsv,
  previewFinanceCommand,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { palette } from '@/theme/palette';

const toMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
      <Text style={styles.kicker}>Financeiro restrito</Text>
      <Text style={styles.title}>Entre para abrir os extratos e ajustes com IA.</Text>
      <Text style={styles.description}>Essa area usa o mesmo sistema de login das demais areas protegidas.</Text>
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
      {authState.user ? <Text style={styles.description}>Sessao ativa: {authState.user.username}</Text> : null}
    </Card>
  );
}

export default function FinanceScreen() {
  const { authState, logout } = useAuth();
  const [month, setMonth] = useState(() => toMonthKey());
  const [workspace, setWorkspace] = useState({
    imports: [],
    transactions: [],
    summary: { total: 0, visible: 0, income: 0, expenses: 0, balance: 0 },
    months: [],
  } as any);
  const [filename, setFilename] = useState('');
  const [csvText, setCsvText] = useState('');
  const [command, setCommand] = useState('');
  const [commandPreview, setCommandPreview] = useState<any>(null);
  const [filters, setFilters] = useState({
    date: '',
    description: '',
    bank: '',
    category: '',
    type: '',
    amount: '',
    balance: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isRemovingImport, setIsRemovingImport] = useState(false);
  const [isCommandLoading, setIsCommandLoading] = useState(false);
  const [isApplyingCommand, setIsApplyingCommand] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const isBusy = isLoading || isImporting || isRemovingImport || isCommandLoading || isApplyingCommand;

  const loadWorkspace = useCallback(async (targetMonth = month) => {
    if (!authState.authenticated) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchFinanceWorkspace({ month: targetMonth });
      setWorkspace(payload);
    } catch (error: any) {
      setWorkspace({
        imports: [],
        transactions: [],
        summary: { total: 0, visible: 0, income: 0, expenses: 0, balance: 0 },
        months: [],
      });
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [authState.authenticated, month]);

  useFocusEffect(
    useCallback(() => {
      loadWorkspace(month);
    }, [loadWorkspace, month]),
  );

  const availableMonths = useMemo(() => {
    const months = new Set([month, ...(workspace.months || [])]);
    return [...months].sort((left, right) => right.localeCompare(left));
  }, [month, workspace.months]);

  const bankOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set((workspace.transactions || []).map((item: any) => String(item.bank || '')).filter(Boolean)),
      ).sort() as string[],
    [workspace.transactions],
  );
  const categoryOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set((workspace.transactions || []).map((item: any) => String(item.category || '')).filter(Boolean)),
      ).sort() as string[],
    [workspace.transactions],
  );
  const typeOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set((workspace.transactions || []).map((item: any) => String(item.type || '')).filter(Boolean)),
      ).sort() as string[],
    [workspace.transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      (workspace.transactions || []).filter((item: any) => {
        if (filters.date && !String(item.date || '').toLowerCase().includes(filters.date.toLowerCase())) return false;
        if (
          filters.description &&
          !String(item.description || '').toLowerCase().includes(filters.description.toLowerCase())
        ) {
          return false;
        }
        if (filters.bank && String(item.bank || '') !== filters.bank) return false;
        if (filters.category && String(item.category || '') !== filters.category) return false;
        if (filters.type && String(item.type || '') !== filters.type) return false;
        if (filters.amount && !String(item.amount ?? '').includes(filters.amount)) return false;
        if (filters.balance && !String(item.balance ?? '').includes(filters.balance)) return false;
        return true;
      }),
    [filters, workspace.transactions],
  );

  const filteredSummary = useMemo(() => {
    const visibleTransactions = filteredTransactions.filter((item: any) => !item.ignored);
    const income = visibleTransactions
      .filter((item: any) => Number(item.amount) > 0)
      .reduce((total: number, item: any) => total + Number(item.amount), 0);
    const expenses = visibleTransactions
      .filter((item: any) => Number(item.amount) < 0)
      .reduce((total: number, item: any) => total + Math.abs(Number(item.amount)), 0);

    return {
      rows: filteredTransactions.length,
      visible: visibleTransactions.length,
      income,
      expenses,
      balance: income - expenses,
    };
  }, [filteredTransactions]);

  const handleImport = async () => {
    if (!filename.trim() || !csvText.trim()) {
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = await importFinanceCsv({
        filename: filename.trim(),
        csvText,
        month,
      });
      setWorkspace(payload.workspace);
      setFilename('');
      setCsvText('');
      setStatusMessage(`${payload.imported.rowCount} lancamento(s) importado(s) de ${payload.imported.bank}.`);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePreviewCommand = async () => {
    if (!command.trim()) {
      return;
    }

    setIsCommandLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const payload = await previewFinanceCommand({ command: command.trim(), month });
      setCommandPreview(payload);
    } catch (error: any) {
      setCommandPreview(null);
      setErrorMessage(error.message);
    } finally {
      setIsCommandLoading(false);
    }
  };

  const handleApplyCommand = async () => {
    if (!commandPreview) {
      return;
    }

    setIsApplyingCommand(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const payload = await applyFinanceCommand(commandPreview);
      setWorkspace(payload.workspace);
      setStatusMessage(`${payload.applied.matchedCount} lancamento(s) atualizado(s).`);
      setCommandPreview(null);
      setCommand('');
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsApplyingCommand(false);
    }
  };

  const handleRemoveImport = async (importItem: any) => {
    setIsRemovingImport(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const payload = await deleteFinanceImport({ importId: importItem.id, month });
      setWorkspace(payload.workspace);
      setStatusMessage(`Importacao removida: ${importItem.filename}.`);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsRemovingImport(false);
    }
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
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
        <Text style={styles.kicker}>Financeiro</Text>
        <Text style={styles.title}>Extratos mensais</Text>
        <Text style={styles.description}>
          Suba CSVs de bancos diferentes, consolide os lancamentos e ajuste a tabela por comando.
        </Text>
        <View style={styles.userRow}>
          <Text style={styles.userChip}>{authState.user?.username || 'Sessao ativa'}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonLabel}>Sair</Text>
          </Pressable>
        </View>
      </Card>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {statusMessage ? <Text style={styles.successText}>{statusMessage}</Text> : null}

      <Card>
        <Text style={styles.kicker}>Mes ativo</Text>
        <Text style={styles.panelTitle}>{formatMonth(month)}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {availableMonths.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, month === item && styles.chipActive]}
              onPress={() => setMonth(item)}>
              <Text style={[styles.chipLabel, month === item && styles.chipLabelActive]}>
                {formatMonth(item)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Entradas</Text>
            <Text style={styles.metricValue}>{formatCurrency(filteredSummary.income)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Saidas</Text>
            <Text style={styles.metricValue}>{formatCurrency(filteredSummary.expenses)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Saldo filtrado</Text>
            <Text style={styles.metricValue}>{formatCurrency(filteredSummary.balance)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Linhas filtradas</Text>
            <Text style={styles.metricValue}>{filteredSummary.rows}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.kicker}>Importar CSV</Text>
        <TextInput
          style={styles.input}
          value={filename}
          onChangeText={setFilename}
          placeholder="Nome do arquivo CSV"
          placeholderTextColor={palette.muted}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={csvText}
          onChangeText={setCsvText}
          placeholder="Cole aqui o conteudo do CSV"
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
        />
        <Pressable style={[styles.button, styles.primaryButton]} onPress={handleImport} disabled={isBusy}>
          <Text style={styles.primaryButtonLabel}>{isImporting ? 'Importando...' : 'Importar CSV'}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.kicker}>Comando financeiro</Text>
        <Text style={styles.panelTitle}>Ajustar tabela com IA</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={command}
          onChangeText={setCommand}
          placeholder="Ex.: categoriza Mercado Livre como Ferramentas e marca PIX da Lulu como pessoal"
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
        />
        <Pressable style={[styles.button, styles.primaryButton]} onPress={handlePreviewCommand} disabled={isBusy}>
          <Text style={styles.primaryButtonLabel}>{isCommandLoading ? 'Analisando...' : 'Gerar preview'}</Text>
        </Pressable>

        {commandPreview ? (
          <View style={styles.previewList}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Preview</Text>
                <Text style={styles.previewTitle}>{commandPreview.matchedCount} lancamento(s) encontrados</Text>
              </View>
              <Text style={styles.tag}>Groq</Text>
            </View>

            <View style={styles.previewJsonGrid}>
              <View style={styles.previewJsonCard}>
                <Text style={styles.kicker}>Filtros</Text>
                <Text style={styles.codeText}>{JSON.stringify(commandPreview.filters, null, 2)}</Text>
              </View>
              <View style={styles.previewJsonCard}>
                <Text style={styles.kicker}>Alteracoes</Text>
                <Text style={styles.codeText}>{JSON.stringify(commandPreview.changes, null, 2)}</Text>
              </View>
            </View>

            {(commandPreview.matchedTransactions || []).map((item: any) => (
              <View key={item.id} style={styles.previewItem}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.previewItemTitle}>{item.description}</Text>
                  <Text style={styles.metaText}>
                    {item.date} · {item.bank} · {item.category || 'Sem categoria'}
                  </Text>
                </View>
                <Text style={styles.metaStrong}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={handleApplyCommand}
                disabled={isBusy || !commandPreview.matchedCount}>
                <Text style={styles.primaryButtonLabel}>
                  {isApplyingCommand ? 'Aplicando...' : 'Aplicar alteracoes'}
                </Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setCommandPreview(null)} disabled={isBusy}>
                <Text style={styles.buttonLabel}>Limpar preview</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.kicker}>Filtros</Text>
        <View style={styles.filterGrid}>
          <TextInput
            style={styles.input}
            value={filters.date}
            onChangeText={(value) => updateFilter('date', value)}
            placeholder="Data"
            placeholderTextColor={palette.muted}
          />
          <TextInput
            style={styles.input}
            value={filters.description}
            onChangeText={(value) => updateFilter('description', value)}
            placeholder="Descricao"
            placeholderTextColor={palette.muted}
          />
          <TextInput
            style={styles.input}
            value={filters.amount}
            onChangeText={(value) => updateFilter('amount', value)}
            placeholder="Valor"
            placeholderTextColor={palette.muted}
          />
          <TextInput
            style={styles.input}
            value={filters.balance}
            onChangeText={(value) => updateFilter('balance', value)}
            placeholder="Saldo"
            placeholderTextColor={palette.muted}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {['', ...bankOptions].map((item) => (
            <Pressable
              key={`bank-${item || 'all'}`}
              style={[styles.chip, filters.bank === item && styles.chipActive]}
              onPress={() => updateFilter('bank', item)}>
              <Text style={[styles.chipLabel, filters.bank === item && styles.chipLabelActive]}>
                {item || 'Todos bancos'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {['', ...categoryOptions].map((item) => (
            <Pressable
              key={`category-${item || 'all'}`}
              style={[styles.chip, filters.category === item && styles.chipActive]}
              onPress={() => updateFilter('category', item)}>
              <Text style={[styles.chipLabel, filters.category === item && styles.chipLabelActive]}>
                {item || 'Todas categorias'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
          {['', ...typeOptions].map((item) => (
            <Pressable
              key={`type-${item || 'all'}`}
              style={[styles.chip, filters.type === item && styles.chipActive]}
              onPress={() => updateFilter('type', item)}>
              <Text style={[styles.chipLabel, filters.type === item && styles.chipLabelActive]}>
                {item || 'Todos tipos'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      <Card>
        <Text style={styles.kicker}>Tabela consolidada</Text>
        <Text style={styles.panelTitle}>{formatMonth(month)}</Text>
        {isLoading ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
        ) : filteredTransactions.length ? (
          <View style={styles.transactionList}>
            {filteredTransactions.map((item: any) => (
              <View key={item.id} style={[styles.transactionItem, item.ignored && styles.transactionItemMuted]}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.previewItemTitle}>{item.description}</Text>
                  <Text style={styles.metaText}>
                    {item.date} · {item.bank} · {item.category || 'Sem categoria'}
                  </Text>
                  <Text style={styles.metaText}>
                    {item.type} · Saldo {item.balance === null ? '-' : formatCurrency(item.balance)}
                  </Text>
                </View>
                <Text style={[styles.metaStrong, item.amount < 0 ? styles.negativeText : styles.positiveText]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.description}>Nenhum CSV importado neste mes.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.kicker}>Historico de importacao</Text>
        <Text style={styles.panelTitle}>Arquivos do mes</Text>
        <View style={styles.transactionList}>
          {(workspace.imports || []).map((item: any) => (
            <View key={item.id} style={styles.importItem}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.previewItemTitle}>{item.filename}</Text>
                <Text style={styles.metaText}>
                  {item.bank} · {item.rowCount} linhas · {item.createdBy} · {item.createdAtLabel}
                </Text>
              </View>
              <Pressable onPress={() => handleRemoveImport(item)} disabled={isBusy}>
                <Text style={styles.removeText}>Remover</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const formatMonth = (month: string) => {
  const [year, rawMonth] = String(month || '').split('-');
  const date = new Date(Number(year || 0), Number(rawMonth || 1) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

const styles = StyleSheet.create({
  kicker: { color: palette.secondaryText, textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  title: { color: palette.text, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 10 },
  panelTitle: { color: palette.text, fontSize: 24, fontWeight: '700', marginTop: 10 },
  description: { color: palette.subtleText, fontSize: 15, lineHeight: 24, marginTop: 12 },
  formGroup: { gap: 12, marginTop: 18 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18 },
  userChip: { color: palette.text, backgroundColor: palette.softPanel, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  button: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.softPanel },
  primaryButton: { backgroundColor: palette.accent },
  buttonLabel: { color: palette.text, fontWeight: '600' },
  primaryButtonLabel: { color: palette.text, fontWeight: '700' },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.softPanel,
    color: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginTop: 12,
  },
  textArea: { minHeight: 120 },
  metricsGrid: { gap: 12, marginTop: 18 },
  metricCard: { borderRadius: 18, padding: 16, backgroundColor: palette.softPanel },
  metricLabel: { color: palette.subtleText, fontSize: 13 },
  metricValue: { color: palette.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  chipsWrap: { gap: 10, paddingTop: 14, paddingRight: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: palette.softPanel },
  chipActive: { backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.accent },
  chipLabel: { color: palette.subtleText, fontWeight: '600' },
  chipLabelActive: { color: palette.accent },
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
  previewList: { gap: 12, marginTop: 16 },
  previewHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  previewTitle: { color: palette.text, fontSize: 20, fontWeight: '700', marginTop: 6 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.softPanel,
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  previewJsonGrid: { gap: 12 },
  previewJsonCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  codeText: { color: palette.subtleText, fontSize: 12, lineHeight: 18 },
  previewItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  previewItemTitle: { color: palette.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  metaText: { color: palette.subtleText, fontSize: 13, lineHeight: 18 },
  metaStrong: { color: palette.text, fontSize: 14, fontWeight: '700' },
  actionRow: { gap: 12, marginTop: 6 },
  filterGrid: { gap: 12 },
  transactionList: { gap: 12, marginTop: 16 },
  transactionItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  transactionItemMuted: { opacity: 0.58 },
  positiveText: { color: '#9CF1B8' },
  negativeText: { color: '#FFB1B1' },
  importItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: palette.softPanel,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeText: { color: palette.danger, fontWeight: '700' },
});
