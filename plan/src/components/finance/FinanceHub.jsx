import { useEffect, useMemo, useState } from 'react'
import {
  applyFinanceCommand,
  deleteFinanceImport,
  fetchFinanceWorkspace,
  importFinanceCsv,
  logout,
  previewFinanceCommand,
} from '../../lib/plannerApi'

const toMonthKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function FinanceHub({ user, onBack, onLogout }) {
  const [month, setMonth] = useState(() => toMonthKey())
  const [workspace, setWorkspace] = useState({
    imports: [],
    transactions: [],
    summary: { total: 0, visible: 0, income: 0, expenses: 0, balance: 0 },
    months: [],
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isRemovingImport, setIsRemovingImport] = useState(false)
  const [isCommandLoading, setIsCommandLoading] = useState(false)
  const [isApplyingCommand, setIsApplyingCommand] = useState(false)
  const [command, setCommand] = useState('')
  const [commandPreview, setCommandPreview] = useState(null)
  const [filters, setFilters] = useState({
    date: '',
    description: '',
    bank: '',
    category: '',
    type: '',
    amount: '',
    balance: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const isBusy = isLoading || isImporting || isRemovingImport || isCommandLoading || isApplyingCommand

  const loadWorkspace = async (targetMonth = month) => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const payload = await fetchFinanceWorkspace({ month: targetMonth })
      setWorkspace(payload)
    } catch (error) {
      setWorkspace({
        imports: [],
        transactions: [],
        summary: { total: 0, visible: 0, income: 0, expenses: 0, balance: 0 },
        months: [],
      })
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace(month)
  }, [month])

  useEffect(() => {
    setCommandPreview(null)
    setStatusMessage('')
  }, [month])

  const filteredTransactions = useMemo(
    () =>
      (workspace.transactions || []).filter((item) => {
        if (filters.date && !String(item.date || '').toLowerCase().includes(filters.date.toLowerCase())) {
          return false
        }
        if (
          filters.description &&
          !String(item.description || '').toLowerCase().includes(filters.description.toLowerCase())
        ) {
          return false
        }
        if (filters.bank && String(item.bank || '') !== filters.bank) {
          return false
        }
        if (filters.category && String(item.category || '') !== filters.category) {
          return false
        }
        if (filters.type && String(item.type || '') !== filters.type) {
          return false
        }
        if (filters.amount && !String(item.amount ?? '').includes(filters.amount)) {
          return false
        }
        if (filters.balance && !String(item.balance ?? '').includes(filters.balance)) {
          return false
        }
        return true
      }),
    [filters, workspace.transactions],
  )

  const availableMonths = useMemo(() => {
    const months = new Set([month, ...(workspace.months || [])])
    return [...months].sort((left, right) => right.localeCompare(left))
  }, [month, workspace.months])

  const filteredSummary = useMemo(() => {
    const visibleTransactions = filteredTransactions.filter((item) => !item.ignored)
    const income = visibleTransactions
      .filter((item) => Number(item.amount) > 0)
      .reduce((total, item) => total + Number(item.amount), 0)
    const expenses = visibleTransactions
      .filter((item) => Number(item.amount) < 0)
      .reduce((total, item) => total + Math.abs(Number(item.amount)), 0)

    return {
      rows: filteredTransactions.length,
      visible: visibleTransactions.length,
      income,
      expenses,
      balance: income - expenses,
    }
  }, [filteredTransactions])

  const bankOptions = useMemo(
    () => [...new Set((workspace.transactions || []).map((item) => item.bank).filter(Boolean))].sort(),
    [workspace.transactions],
  )

  const categoryOptions = useMemo(
    () => [...new Set((workspace.transactions || []).map((item) => item.category).filter(Boolean))].sort(),
    [workspace.transactions],
  )

  const typeOptions = useMemo(
    () => [...new Set((workspace.transactions || []).map((item) => item.type).filter(Boolean))].sort(),
    [workspace.transactions],
  )

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onLogout?.()
    }
  }

  const handleImport = async (event) => {
    event.preventDefault()

    if (!selectedFile) {
      return
    }

    setIsImporting(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const csvText = await selectedFile.text()
      const payload = await importFinanceCsv({
        filename: selectedFile.name,
        csvText,
        month,
      })

      setWorkspace(payload.workspace)
      setSelectedFile(null)
      event.target.reset()
      setStatusMessage(`${payload.imported.rowCount} lancamento(s) importado(s) de ${payload.imported.bank}.`)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handlePreviewCommand = async (event) => {
    event.preventDefault()

    const nextCommand = command.trim()

    if (!nextCommand) {
      return
    }

    setIsCommandLoading(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const payload = await previewFinanceCommand({ command: nextCommand, month })
      setCommandPreview(payload)
    } catch (error) {
      setCommandPreview(null)
      setErrorMessage(error.message)
    } finally {
      setIsCommandLoading(false)
    }
  }

  const handleRemoveImport = async (importItem) => {
    setIsRemovingImport(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const payload = await deleteFinanceImport({
        importId: importItem.id,
        month,
      })
      setWorkspace(payload.workspace)
      setStatusMessage(`Importacao removida: ${importItem.filename}.`)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsRemovingImport(false)
    }
  }

  const handleApplyCommand = async () => {
    if (!commandPreview) {
      return
    }

    setIsApplyingCommand(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const payload = await applyFinanceCommand(commandPreview)
      setWorkspace(payload.workspace)
      setStatusMessage(`${payload.applied.matchedCount} lancamento(s) atualizado(s).`)
      setCommandPreview(null)
      setCommand('')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsApplyingCommand(false)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return (
    <section className="projects-page finance-page">
      <aside className="projects-sidebar finance-sidebar">
        <div className="projects-sidebar-copy">
          <span className="hero-kicker">Financeiro</span>
          <h1>Extratos mensais</h1>
          <p>Suba CSVs de bancos diferentes, consolide os lancamentos e ajuste a tabela por comando.</p>
          <div className="responses-auth-row">
            <span className="responses-user-chip">{user?.username || 'Sessao ativa'}</span>
            <button type="button" className="sidebar-ghost-action" onClick={handleLogout}>
              Sair
            </button>
          </div>
          {onBack ? (
            <button type="button" className="sidebar-ghost-action" onClick={onBack}>
              Voltar ao dashboard
            </button>
          ) : null}
        </div>

        <label className="responses-field">
          <span>Mes</span>
          <select value={month} onChange={(event) => setMonth(event.target.value)} disabled={isBusy}>
            {availableMonths.map((item) => (
              <option key={item} value={item}>
                {formatMonth(item)}
              </option>
            ))}
          </select>
        </label>

        <form className="finance-upload-form" onSubmit={handleImport}>
          <label className="responses-field">
            <span>CSV bancario</span>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={isBusy}
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" className="sidebar-action is-primary" disabled={isBusy || !selectedFile}>
            {isImporting ? 'Importando...' : 'Importar CSV'}
          </button>
        </form>

        <div className="responses-metric-grid finance-metrics">
          <article className="responses-metric-card">
            <span>Entradas</span>
            <strong>{formatCurrency(filteredSummary.income)}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Saidas</span>
            <strong>{formatCurrency(filteredSummary.expenses)}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Saldo filtrado</span>
            <strong>{formatCurrency(filteredSummary.balance)}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Linhas filtradas</span>
            <strong>{filteredSummary.rows}</strong>
          </article>
        </div>
      </aside>

      <main className="projects-content finance-content">
        {errorMessage ? (
          <div className="feedback-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="feedback-banner feedback-banner-success" role="status">
            {statusMessage}
          </div>
        ) : null}

        <header className="daily-header project-summary-card finance-summary-card">
          <div>
            <span className="eyebrow">Mes ativo</span>
            <h2>{formatMonth(month)}</h2>
            <p>Tabela compartilhada para importar, revisar e recategorizar os extratos do periodo.</p>
          </div>

          <div className="daily-stats">
            <article>
              <span>Lancamentos</span>
              <strong>{filteredSummary.rows}</strong>
            </article>
            <article>
              <span>Visiveis</span>
              <strong>{filteredSummary.visible}</strong>
            </article>
          </div>
        </header>

        <section className="task-panel ai-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Comando financeiro</span>
              <h3>Ajustar tabela com IA</h3>
            </div>
          </div>

          <form className="task-form ai-command-form" onSubmit={handlePreviewCommand}>
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Ex.: categoriza Mercado Livre como Ferramentas e marca PIX da Lulu como pessoal"
              rows={4}
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy || !command.trim()}>
              {isCommandLoading ? 'Analisando...' : 'Gerar preview'}
            </button>
          </form>

          {commandPreview ? (
            <div className="ai-preview-card">
              <div className="ai-preview-head">
                <div>
                  <span className="eyebrow">Preview</span>
                  <strong>{commandPreview.matchedCount} lancamento(s) encontrados</strong>
                </div>
                <span className="card-tag">Groq</span>
              </div>

              <div className="finance-change-grid">
                <article className="project-card finance-mini-card">
                  <span className="hero-kicker">Filtros</span>
                  <pre>{JSON.stringify(commandPreview.filters, null, 2)}</pre>
                </article>
                <article className="project-card finance-mini-card">
                  <span className="hero-kicker">Alteracoes</span>
                  <pre>{JSON.stringify(commandPreview.changes, null, 2)}</pre>
                </article>
              </div>

              <div className="ai-preview-list">
                {(commandPreview.matchedTransactions || []).map((item) => (
                  <article key={item.id} className="ai-preview-item">
                    <div>
                      <strong>{item.description}</strong>
                      <p>{item.date} · {item.bank} · {item.category || 'Sem categoria'}</p>
                    </div>
                    <small>{formatCurrency(item.amount)}</small>
                  </article>
                ))}
              </div>

              <div className="ai-preview-actions">
                <button
                  type="button"
                  className="sidebar-action is-primary"
                  disabled={isBusy || !commandPreview.matchedCount}
                  onClick={handleApplyCommand}
                >
                  {isApplyingCommand ? 'Aplicando...' : 'Aplicar alteracoes'}
                </button>
                <button
                  type="button"
                  className="sidebar-ghost-action ai-reset-button"
                  disabled={isBusy}
                  onClick={() => setCommandPreview(null)}
                >
                  Limpar preview
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Tabela consolidada</span>
              <h3>{formatMonth(month)}</h3>
            </div>
          </div>

          {isLoading ? (
            <div className="project-card">
              <span className="hero-kicker">Sincronizando</span>
              <h2>Carregando lancamentos...</h2>
            </div>
          ) : workspace.transactions.length ? (
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descricao</th>
                    <th>Banco</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Saldo</th>
                  </tr>
                  <tr className="finance-filter-row">
                    <th>
                      <input
                        type="text"
                        value={filters.date}
                        onChange={(event) => updateFilter('date', event.target.value)}
                        placeholder="Filtrar"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.description}
                        onChange={(event) => updateFilter('description', event.target.value)}
                        placeholder="Filtrar"
                      />
                    </th>
                    <th>
                      <select value={filters.bank} onChange={(event) => updateFilter('bank', event.target.value)}>
                        <option value="">Todos</option>
                        {bankOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th>
                      <select
                        value={filters.category}
                        onChange={(event) => updateFilter('category', event.target.value)}
                      >
                        <option value="">Todas</option>
                        {categoryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th>
                      <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
                        <option value="">Todos</option>
                        {typeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.amount}
                        onChange={(event) => updateFilter('amount', event.target.value)}
                        placeholder="Filtrar"
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={filters.balance}
                        onChange={(event) => updateFilter('balance', event.target.value)}
                        placeholder="Filtrar"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item.id} className={item.ignored ? 'is-ignored' : ''}>
                      <td>{item.date}</td>
                      <td>
                        <strong>{item.description}</strong>
                        {item.notes ? <small>{item.notes}</small> : null}
                      </td>
                      <td>{item.bank}</td>
                      <td>{item.category || 'Sem categoria'}</td>
                      <td>{item.type}</td>
                      <td className={item.amount < 0 ? 'is-negative' : 'is-positive'}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td>{item.balance === null ? '-' : formatCurrency(item.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="project-card">
              <span className="hero-kicker">Sem extratos</span>
              <h2>Nenhum CSV importado neste mes.</h2>
              <p>Importe um ou mais arquivos para consolidar os lancamentos aqui.</p>
            </div>
          )}
        </section>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Historico de importacao</span>
              <h3>Arquivos do mes</h3>
            </div>
          </div>

          <div className="project-list">
            {(workspace.imports || []).map((item) => (
              <article key={item.id} className="project-list-item finance-import-item">
                <span className="project-list-bullet">•</span>
                <div>
                  <strong>{item.filename}</strong>
                  <p>{item.bank} · {item.rowCount} linhas · {item.createdBy} · {item.createdAtLabel}</p>
                </div>
                <button
                  type="button"
                  className="task-remove"
                  disabled={isBusy}
                  onClick={() => handleRemoveImport(item)}
                >
                  Remover
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </section>
  )
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))

const formatMonth = (month) => {
  const [year, rawMonth] = String(month || '').split('-')
  const date = new Date(Number(year || 0), Number(rawMonth || 1) - 1, 1)

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default FinanceHub
