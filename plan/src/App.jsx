import { useEffect, useState } from 'react'
import Dashboard from './componets/dashboard'
import { fetchDays } from './lib/plannerApi'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState(() =>
    window.location.hash === '#planner' ? 'planner' : 'home',
  )
  const [plannerDays, setPlannerDays] = useState([])

  useEffect(() => {
    const syncViewWithHash = () => {
      setActiveView(window.location.hash === '#planner' ? 'planner' : 'home')
    }

    window.addEventListener('hashchange', syncViewWithHash)

    return () => window.removeEventListener('hashchange', syncViewWithHash)
  }, [])

  useEffect(() => {
    const loadPlannerPreview = async () => {
      try {
        const payload = await fetchDays()
        setPlannerDays(payload.days || [])
      } catch {
        setPlannerDays([])
      }
    }

    loadPlannerPreview()
  }, [activeView])

  const openPlanner = () => {
    window.location.hash = 'planner'
  }

  const openHome = () => {
    window.location.hash = ''
  }

  const totalTasks = plannerDays.reduce((total, day) => total + day.tasks.length, 0)
  const completedTasks = plannerDays.reduce(
    (total, day) => total + day.tasks.filter((task) => task.done).length,
    0,
  )
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const chartDays = plannerDays.slice(0, 5)

  if (activeView === 'planner') {
    return (
      <main className="app-shell">
        <Dashboard onBack={openHome} />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="workspace-home">
        <header className="workspace-hero">
          <div className="hero-copy">
            <span className="hero-kicker">Workspace central</span>
            <h1>Um painel unico para operacao, rotina e acompanhamento.</h1>
            <p>
              O planner agora vira uma aba dentro de um dashboard principal. As outras areas ja ficam
              desenhadas como proximas entregas para voce expandir depois.
            </p>

            <div className="hero-actions">
              <button type="button" className="hero-button is-primary" onClick={openPlanner}>
                Abrir planner
              </button>
              <button type="button" className="hero-button" disabled>
                Personalizar dashboard
              </button>
            </div>
          </div>

          <section className="hero-panel">
            <div className="hero-metric">
              <span>Execucao atual</span>
              <strong>{completionRate}%</strong>
            </div>
            <div className="hero-metric">
              <span>Tarefas concluidas</span>
              <strong>{completedTasks}</strong>
            </div>
            <div className="hero-metric">
              <span>Total monitorado</span>
              <strong>{totalTasks}</strong>
            </div>
          </section>
        </header>

        <section className="overview-grid">
          <article className="dashboard-card is-featured">
            <div className="card-head">
              <div>
                <span className="card-kicker">Planner</span>
                <h2>Tarefas por dia</h2>
              </div>
              <span className="card-tag is-live">Ativo</span>
            </div>
            <p>
              Controle diario com notas por data, criacao automatica da nota de hoje e remocao de dias.
            </p>
            <div className="card-stats">
              <span>{plannerDays.length} dias carregados</span>
              <span>{pendingTasksLabel(totalTasks, completedTasks)}</span>
            </div>
            <button type="button" className="card-action" onClick={openPlanner}>
              Entrar
            </button>
          </article>

          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Mensagens</span>
                <h2>Hub de respostas</h2>
              </div>
              <span className="card-tag">Em breve</span>
            </div>
            <p>
              Central para respostas de formularios dos seus sites, com filtros por origem, prioridade e
              status de atendimento.
            </p>
            <button type="button" className="card-action is-disabled" disabled>
              Planejado
            </button>
          </article>

          <article className="dashboard-card productivity-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Produtividade</span>
                <h2>Ritmo de execucao</h2>
              </div>
              <span className="card-tag">Preview</span>
            </div>

            <div className="productivity-chart" aria-label="Grafico de produtividade">
              {(chartDays.length ? chartDays : fallbackChartDays).map((day, index) => {
                const total = day.tasks?.length || day.total || 0
                const done = day.tasks?.filter((task) => task.done).length || day.done || 0
                const height = total ? Math.max(24, Math.round((done / total) * 100)) : 24

                return (
                  <div key={`${day.id || day.label}-${index}`} className="chart-column">
                    <div className="chart-track">
                      <span className="chart-bar" style={{ height: `${height}%` }} />
                    </div>
                    <strong>{done}</strong>
                    <small>{day.label}</small>
                  </div>
                )
              })}
            </div>
          </article>
        </section>

        <section className="secondary-grid">
          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Automacoes</span>
                <h2>Fila de rotina</h2>
              </div>
              <span className="card-tag">Rascunho</span>
            </div>
            <p>
              Espaco para disparos programados, revisoes pendentes e tarefas repetitivas que voce quiser
              consolidar depois.
            </p>
          </article>

          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Financeiro</span>
                <h2>Resumo operacional</h2>
              </div>
              <span className="card-tag">Exemplo</span>
            </div>
            <p>
              Cards de faturamento, metas mensais e alertas de contratos podem entrar aqui quando essa area
              existir.
            </p>
          </article>

          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Agenda</span>
                <h2>Proximos checkpoints</h2>
              </div>
              <span className="card-tag">Exemplo</span>
            </div>
            <ul className="mini-list">
              <li>Review semanal do planner</li>
              <li>Consolidacao do hub de mensagens</li>
              <li>Primeira versao do painel de produtividade</li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  )
}

const fallbackChartDays = [
  { label: 'Seg', done: 2, total: 4 },
  { label: 'Ter', done: 3, total: 5 },
  { label: 'Qua', done: 4, total: 6 },
  { label: 'Qui', done: 3, total: 4 },
  { label: 'Sex', done: 5, total: 6 },
]

const pendingTasksLabel = (totalTasks, completedTasks) => {
  const pendingTasks = totalTasks - completedTasks
  return `${pendingTasks > 0 ? pendingTasks : 0} pendentes`
}

export default App
