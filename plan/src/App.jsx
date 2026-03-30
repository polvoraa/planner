import { useEffect, useState } from 'react'
import LoginGate from './components/auth/LoginGate'
import Dashboard from './componets/dashboard'
import Dock from './components/dock/Dock'
import ProjectsHub from './components/projects/ProjectsHub'
import ResponsesHub from './components/responses/ResponsesHub'
import { fetchDays, fetchResponses, fetchSession } from './lib/plannerApi'
import './App.css'

const routes = {
  home: '',
  planner: '#planner',
  messages: '#messages',
  projects: '#projects',
}

const WorkspaceIcon = ({ path, isHovered, active }) => {
  const stroke = active ? '#ffb15e' : '#eef4ff'
  const scale = isHovered ? 1.06 : 1

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease' }}
      aria-hidden="true"
    >
      <path d={path} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const iconPaths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z',
  planner: 'M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  messages: 'M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  projects: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z',
}

const getViewFromHash = (hash) => {
  switch (hash) {
    case routes.planner:
      return 'planner'
    case routes.messages:
      return 'messages'
    case routes.projects:
      return 'projects'
    default:
      return 'home'
  }
}

function App() {
  const [activeView, setActiveView] = useState(() => getViewFromHash(window.location.hash))
  const [plannerDays, setPlannerDays] = useState([])
  const [responsesSummary, setResponsesSummary] = useState({
    total: 0,
    unreadTotal: 0,
    bySource: {},
    unreadBySource: {},
  })
  const [authState, setAuthState] = useState({
    checked: false,
    authenticated: false,
    user: null,
  })

  useEffect(() => {
    const syncViewWithHash = () => {
      setActiveView(getViewFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', syncViewWithHash)

    return () => window.removeEventListener('hashchange', syncViewWithHash)
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const payload = await fetchSession()
        setAuthState({
          checked: true,
          authenticated: Boolean(payload.authenticated),
          user: payload.user || null,
        })
      } catch {
        setAuthState({
          checked: true,
          authenticated: false,
          user: null,
        })
      }
    }

    loadSession()
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

  useEffect(() => {
    const loadResponsesPreview = async () => {
      if (!authState.authenticated) {
        setResponsesSummary({ total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} })
        return
      }

      try {
        const payload = await fetchResponses({ limit: 200 })
        setResponsesSummary(
          payload.summary || { total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} },
        )
      } catch {
        setResponsesSummary({ total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} })
      }
    }

    loadResponsesPreview()
  }, [activeView, authState.authenticated])

  const navigateTo = (view) => {
    window.location.hash = routes[view]
  }

  const openHome = () => {
    navigateTo('home')
  }

  const handleAuthenticated = (user) => {
    setAuthState({
      checked: true,
      authenticated: true,
      user,
    })
  }

  const handleAuthLogout = () => {
    setResponsesSummary({ total: 0, unreadTotal: 0, bySource: {}, unreadBySource: {} })
    setAuthState({
      checked: true,
      authenticated: false,
      user: null,
    })
  }

  const totalTasks = plannerDays.reduce((total, day) => total + day.tasks.length, 0)
  const completedTasks = plannerDays.reduce(
    (total, day) => total + day.tasks.filter((task) => task.done).length,
    0,
  )
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const chartDays = plannerDays.slice(0, 5)

  const dockItems = [
    {
      key: 'home',
      label: 'Home',
      isActive: activeView === 'home',
      icon: <WorkspaceIcon path={iconPaths.home} active={activeView === 'home'} />,
      onClick: () => navigateTo('home'),
    },
    {
      key: 'planner',
      label: 'Tarefas',
      isActive: activeView === 'planner',
      icon: <WorkspaceIcon path={iconPaths.planner} active={activeView === 'planner'} />,
      onClick: () => navigateTo('planner'),
    },
    {
      key: 'messages',
      label: responsesSummary.unreadTotal ? `Mensagens (${responsesSummary.unreadTotal})` : 'Mensagens',
      isActive: activeView === 'messages',
      icon: (
        <div className="dock-icon-shell">
          <WorkspaceIcon path={iconPaths.messages} active={activeView === 'messages'} />
          {responsesSummary.unreadTotal ? (
            <span className="dock-icon-badge">{responsesSummary.unreadTotal > 99 ? '99+' : responsesSummary.unreadTotal}</span>
          ) : null}
        </div>
      ),
      onClick: () => navigateTo('messages'),
    },
    {
      key: 'projects',
      label: 'Projetos',
      isActive: activeView === 'projects',
      icon: <WorkspaceIcon path={iconPaths.projects} active={activeView === 'projects'} />,
      onClick: () => navigateTo('projects'),
    },
  ]

  if (activeView === 'planner') {
    return (
      <main className="app-shell app-shell-with-dock">
        <Dashboard onBack={openHome} />
        <div className="app-dock">
          <Dock items={dockItems} panelHeight={32} baseItemSize={48} magnification={64} />
        </div>
      </main>
    )
  }

  if (activeView === 'messages') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso ao hub.</p>
          </section>
        ) : authState.authenticated ? (
          <ResponsesHub
            onBack={openHome}
            user={authState.user}
            onSummaryChange={setResponsesSummary}
            onLogout={handleAuthLogout}
          />
        ) : (
          <LoginGate onAuthenticated={handleAuthenticated} />
        )}
        <div className="app-dock">
          <Dock items={dockItems} panelHeight={32} baseItemSize={48} magnification={64} />
        </div>
      </main>
    )
  }

  if (activeView === 'projects') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso a area de projetos.</p>
          </section>
        ) : authState.authenticated ? (
          <ProjectsHub user={authState.user} onBack={openHome} onLogout={handleAuthLogout} />
        ) : (
          <LoginGate
            onAuthenticated={handleAuthenticated}
            eyebrow="Acesso restrito"
            title="Entre para abrir a area de projetos."
            description="Essa area usa a mesma autenticacao da aba de mensagens para liberar tarefas e anotacoes internas."
          />
        )}
        <div className="app-dock">
          <Dock items={dockItems} panelHeight={32} baseItemSize={48} magnification={64} />
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell app-shell-with-dock">
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
              <button type="button" className="hero-button is-primary" onClick={() => navigateTo('planner')}>
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
            <button type="button" className="card-action" onClick={() => navigateTo('planner')}>
              Entrar
            </button>
          </article>

          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Mensagens</span>
                <h2>Hub de respostas</h2>
              </div>
              <span className="card-tag is-live">Conectado</span>
            </div>
            <p>
              Central para respostas de formularios dos seus sites, com filtros por origem, prioridade e
              status de atendimento.
            </p>
            <div className="card-stats">
              <span>
                {authState.authenticated
                  ? `${responsesSummary.unreadTotal || 0} nao lidas`
                  : 'Acesso protegido'}
              </span>
              <span>
                {authState.authenticated
                  ? `${Object.keys(responsesSummary.bySource || {}).length} origens`
                  : 'Login necessario'}
              </span>
            </div>
            <button type="button" className="card-action" onClick={() => navigateTo('messages')}>
              Entrar
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
      <div className="app-dock">
        <Dock items={dockItems} panelHeight={32} baseItemSize={48} magnification={64} />
      </div>
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
