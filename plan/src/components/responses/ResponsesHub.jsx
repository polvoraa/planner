import { useEffect, useMemo, useState } from 'react'
import { fetchResponses } from '../../lib/plannerApi'

const formatDate = (value) => {
  if (!value) {
    return 'Sem data'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Sem data'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function ResponsesHub({ onBack }) {
  const [responses, setResponses] = useState([])
  const [summary, setSummary] = useState({ total: 0, bySource: {} })
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadResponses = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const payload = await fetchResponses({
          source: sourceFilter,
          search,
        })

        setResponses(payload.items || [])
        setSummary(payload.summary || { total: 0, bySource: {} })
      } catch (error) {
        setResponses([])
        setSummary({ total: 0, bySource: {} })
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadResponses()
  }, [search, sourceFilter])

  const sourceOptions = useMemo(() => {
    const knownSources = Object.keys(summary.bySource || {})

    if (sourceFilter && !knownSources.includes(sourceFilter)) {
      knownSources.unshift(sourceFilter)
    }

    return knownSources
  }, [sourceFilter, summary.bySource])

  return (
    <section className="responses-page">
      <aside className="responses-sidebar">
        <div className="responses-sidebar-copy">
          <span className="hero-kicker">Mensagens centralizadas</span>
          <h1>Hub de respostas</h1>
          <p>
            Visualize os envios dos formularios conectados ao mesmo cluster MongoDB e filtre por
            origem ou texto.
          </p>
          {onBack ? (
            <button type="button" className="sidebar-ghost-action" onClick={onBack}>
              Voltar ao dashboard
            </button>
          ) : null}
        </div>

        <div className="responses-metric-grid">
          <article className="responses-metric-card">
            <span>Total carregado</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Origens</span>
            <strong>{Math.max(sourceOptions.length, 1)}</strong>
          </article>
        </div>
      </aside>

      <main className="responses-content">
        <section className="responses-toolbar">
          <label className="responses-field">
            <span>Buscar</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, email, mensagem..."
            />
          </label>

          <label className="responses-field">
            <span>Origem</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="">Todas</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </section>

        {errorMessage ? (
          <div className="feedback-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <section className="responses-empty-state">
            <span className="hero-kicker">Sincronizando</span>
            <h2>Carregando respostas...</h2>
            <p>Aguarde enquanto a API consulta os envios salvos no MongoDB.</p>
          </section>
        ) : null}

        {!isLoading && !responses.length ? (
          <section className="responses-empty-state">
            <span className="hero-kicker">Sem resultados</span>
            <h2>Nenhuma resposta encontrada.</h2>
            <p>Ajuste os filtros ou confira se a collection configurada contem documentos.</p>
          </section>
        ) : null}

        {!isLoading && responses.length ? (
          <section className="responses-list">
            {responses.map((item) => (
              <article key={item.id} className="response-card">
                <div className="response-card-head">
                  <div>
                    <span className="card-kicker">{item.source}</span>
                    <h2>{item.name}</h2>
                  </div>
                  <span className="card-tag">{formatDate(item.createdAt)}</span>
                </div>

                <div className="response-meta">
                  <span>{item.email}</span>
                  <span>Atualizado em {formatDate(item.updatedAt)}</span>
                </div>

                <p>{item.message || 'Mensagem vazia.'}</p>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </section>
  )
}

export default ResponsesHub
