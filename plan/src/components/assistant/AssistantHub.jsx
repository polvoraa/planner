import { useEffect, useState } from 'react'
import { analyzeWithAssistant, fetchAssistantContext, logout } from '../../lib/plannerApi'

function AssistantHub({ user, onBack, onLogout }) {
  const [context, setContext] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadContext = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const payload = await fetchAssistantContext()
        setContext(payload)
      } catch (error) {
        setContext(null)
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadContext()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onLogout?.()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextQuestion = question.trim()

    if (!nextQuestion) {
      return
    }

    setIsAnalyzing(true)
    setErrorMessage('')

    try {
      const payload = await analyzeWithAssistant({ question: nextQuestion })
      setAnswer(payload.answer || '')
      setContext(payload.context || context)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isLoading) {
    return (
      <section className="projects-page assistant-page">
        <main className="projects-content">
          <section className="project-card">
            <span className="hero-kicker">Assistente IA</span>
            <h2>Carregando contexto...</h2>
            <p>Buscando planner, projetos, respostas e financeiro para a analise consolidada.</p>
          </section>
        </main>
      </section>
    )
  }

  return (
    <section className="projects-page assistant-page">
      <aside className="projects-sidebar assistant-sidebar">
        <div className="projects-sidebar-copy">
          <span className="hero-kicker">Assistente IA</span>
          <h1>Analise cruzada do workspace</h1>
          <p>
            Pergunte sobre produtividade, gargalos, mensagens, projetos ou movimentacao financeira e a IA
            responde usando o contexto consolidado do app.
          </p>
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

        <div className="responses-metric-grid">
          <article className="responses-metric-card">
            <span>Dias no planner</span>
            <strong>{context?.planner?.totalDays || 0}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Projetos</span>
            <strong>{context?.projects?.totalProjects || 0}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Mensagens nao lidas</span>
            <strong>{context?.responses?.unreadTotal || 0}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Meses financeiros</span>
            <strong>{context?.finance?.availableMonths?.length || 0}</strong>
          </article>
        </div>

        <div className="assistant-suggestion-list">
          {ASSISTANT_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="assistant-suggestion"
              onClick={() => setQuestion(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <main className="projects-content assistant-content">
        {errorMessage ? (
          <div className="feedback-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <section className="task-panel ai-panel assistant-form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Pergunta livre</span>
              <h3>O que voce quer analisar agora?</h3>
            </div>
          </div>

          <form className="task-form ai-command-form" onSubmit={handleSubmit}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              placeholder="Ex.: quais projetos concentram mais pendencias, quais mensagens estao sem ler e como o financeiro do mes conversa com isso?"
              disabled={isAnalyzing}
            />
            <button type="submit" disabled={isAnalyzing || !question.trim()}>
              {isAnalyzing ? 'Analisando...' : 'Perguntar ao assistente'}
            </button>
          </form>
        </section>

        <section className="assistant-summary-grid">
          <article className="project-card assistant-summary-card">
            <span className="hero-kicker">Planner</span>
            <h2>{context?.planner?.pendingTasks || 0} pendencias</h2>
            <p>{context?.planner?.completedTasks || 0} tarefas concluidas no total.</p>
          </article>
          <article className="project-card assistant-summary-card">
            <span className="hero-kicker">Projetos</span>
            <h2>{context?.projects?.totalTasks || 0} tarefas</h2>
            <p>{context?.projects?.totalNotes || 0} anotacoes consolidadas nos projetos.</p>
          </article>
          <article className="project-card assistant-summary-card">
            <span className="hero-kicker">Financeiro</span>
            <h2>{formatCurrency(context?.finance?.months?.[0]?.summary?.balance || 0)}</h2>
            <p>Saldo filtrado do mes mais recente carregado.</p>
          </article>
        </section>

        <section className="task-panel assistant-answer-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Resposta</span>
              <h3>Leitura analitica</h3>
            </div>
          </div>

          {answer ? (
            <div className="assistant-answer-copy">
              {answer.split('\n').map((line, index) => (
                <p key={`${line}-${index}`}>{line || '\u00A0'}</p>
              ))}
            </div>
          ) : (
            <div className="project-card assistant-empty-card">
              <span className="hero-kicker">Pronto para analisar</span>
              <h2>Faça uma pergunta sobre os dados do app.</h2>
              <p>O assistente cruza planner, projetos, respostas e financeiro na mesma resposta.</p>
            </div>
          )}
        </section>
      </main>
    </section>
  )
}

const ASSISTANT_SUGGESTIONS = [
  'Quais sao os maiores gargalos operacionais hoje?',
  'Quais projetos estao acumulando mais pendencias?',
  'Resuma mensagens nao lidas e riscos comerciais.',
  'Como esta o financeiro do mes mais recente?',
]

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))

export default AssistantHub
