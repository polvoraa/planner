import { useEffect, useState } from 'react'
import LoginGate from './components/auth/LoginGate'
import AssistantHub from './components/assistant/AssistantHub'
import Dashboard from './componets/dashboard'
import Dock from './components/dock/Dock'
import FinanceHub from './components/finance/FinanceHub'
import ProjectsHub from './components/projects/ProjectsHub'
import ResponsesHub from './components/responses/ResponsesHub'
import SettingsHub from './components/settings/SettingsHub'
import { fetchDays, fetchResponses, fetchSession } from './lib/plannerApi'
import './App.css'

const THEME_STORAGE_KEY = 'planner.theme'
const routes = {
  home: '',
  planner: '#planner',
  messages: '#messages',
  projects: '#projects',
  finance: '#finance',
  assistant: '#assistant',
  settings: '#settings',
}

const WorkspaceIcon = ({ path, isHovered, active }) => {
  const stroke = active ? 'var(--color-accent-soft)' : 'var(--color-text)'
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
  finance: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM8 9h8M8 13h3M15.5 12.5l1 1 2-2',
  assistant: 'M12 4a8 8 0 1 1 0 16a8 8 0 0 1 0-16Zm0 3.25a2.25 2.25 0 0 0-2.25 2.25M12 15.5h.01M11.95 12.2c0-1.15 1.8-1.43 1.8-3.2a1.75 1.75 0 1 0-3.5 0',
  settings: 'M12 3.75l1.12 2.27 2.5.36-1.81 1.76.43 2.49L12 9.45l-2.24 1.18.43-2.49-1.81-1.76 2.5-.36L12 3.75Zm0 10a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 0 0 0-4.5Z',
}

const getViewFromHash = (hash) => {
  switch (hash) {
    case routes.planner:
      return 'planner'
    case routes.messages:
      return 'messages'
    case routes.projects:
      return 'projects'
    case routes.finance:
      return 'finance'
    case routes.assistant:
      return 'assistant'
    case routes.settings:
      return 'settings'
    default:
      return 'home'
  }
}

function App() {
  const [activeView, setActiveView] = useState(() => getViewFromHash(window.location.hash))
  const [isCompactDock, setIsCompactDock] = useState(() => window.innerWidth <= 720)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'ember')
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
    const syncDockMode = () => {
      setIsCompactDock(window.innerWidth <= 720)
    }

    syncDockMode()
    window.addEventListener('resize', syncDockMode)

    return () => window.removeEventListener('resize', syncDockMode)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

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
      if (!authState.authenticated) {
        setPlannerDays([])
        return
      }

      try {
        const payload = await fetchDays()
        setPlannerDays(payload.days || [])
      } catch {
        setPlannerDays([])
      }
    }

    loadPlannerPreview()
  }, [activeView, authState.authenticated])

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
    {
      key: 'finance',
      label: 'Financeiro',
      isActive: activeView === 'finance',
      icon: <WorkspaceIcon path={iconPaths.finance} active={activeView === 'finance'} />,
      onClick: () => navigateTo('finance'),
    },
    {
      key: 'settings',
      label: 'Config',
      isActive: activeView === 'settings',
      icon: <WorkspaceIcon path={iconPaths.settings} active={activeView === 'settings'} />,
      onClick: () => navigateTo('settings'),
    },
  ]

  const dockProps = isCompactDock
    ? {
        panelHeight: 58,
        baseItemSize: 42,
        magnification: 42,
        distance: 1,
        dockHeight: 58,
        spring: { mass: 0.1, stiffness: 400, damping: 40 },
      }
    : { panelHeight: 32, baseItemSize: 48, magnification: 64, distance: 180, dockHeight: 96 }

  if (activeView === 'planner') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso ao planner.</p>
          </section>
        ) : authState.authenticated ? (
          <Dashboard onBack={openHome} user={authState.user} onLogout={handleAuthLogout} />
        ) : (
          <LoginGate
            onAuthenticated={handleAuthenticated}
            eyebrow="Planner privado"
            title="Entre para abrir suas tarefas diarias."
            description="Cada usuario agora tem um planner diario proprio. Projetos e mensagens continuam compartilhados."
          />
        )}
        <div className="app-dock">
          <Dock items={dockItems} {...dockProps} />
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
          <Dock items={dockItems} {...dockProps} />
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
          <Dock items={dockItems} {...dockProps} />
        </div>
      </main>
    )
  }

  if (activeView === 'finance') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso ao financeiro.</p>
          </section>
        ) : authState.authenticated ? (
          <FinanceHub user={authState.user} onBack={openHome} onLogout={handleAuthLogout} />
        ) : (
          <LoginGate
            onAuthenticated={handleAuthenticated}
            eyebrow="Financeiro restrito"
            title="Entre para abrir os extratos e ajustes com IA."
            description="Essa area usa o mesmo sistema de login das demais areas protegidas."
          />
        )}
        <div className="app-dock">
          <Dock items={dockItems} {...dockProps} />
        </div>
      </main>
    )
  }

  if (activeView === 'assistant') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso ao assistente.</p>
          </section>
        ) : authState.authenticated ? (
          <AssistantHub user={authState.user} onBack={openHome} onLogout={handleAuthLogout} />
        ) : (
          <LoginGate
            onAuthenticated={handleAuthenticated}
            eyebrow="Assistente restrito"
            title="Entre para abrir a analise com IA."
            description="Essa area consulta planner, projetos, mensagens e financeiro em uma visao consolidada."
          />
        )}
        <div className="app-dock">
          <Dock items={dockItems} {...dockProps} />
        </div>
      </main>
    )
  }

  if (activeView === 'settings') {
    return (
      <main className="app-shell app-shell-with-dock">
        {!authState.checked ? (
          <section className="placeholder-view">
            <span className="hero-kicker">Autenticacao</span>
            <h1>Validando sessao...</h1>
            <p>Aguarde enquanto verificamos se voce ja tem acesso as configuracoes.</p>
          </section>
        ) : authState.authenticated ? (
          <SettingsHub
            user={authState.user}
            onBack={openHome}
            onLogout={handleAuthLogout}
            activeTheme={theme}
            onThemeChange={setTheme}
            onOpenAssistant={() => navigateTo('assistant')}
          />
        ) : (
          <LoginGate
            onAuthenticated={handleAuthenticated}
            eyebrow="Configuracoes privadas"
            title="Entre para abrir preferencias e atalhos do app."
            description="As configuracoes ficam protegidas junto com o restante do workspace."
          />
        )}
        <div className="app-dock">
          <Dock items={dockItems} {...dockProps} />
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
              <span>{authState.authenticated ? `${plannerDays.length} dias carregados` : 'Login necessario'}</span>
              <span>{authState.authenticated ? pendingTasksLabel(totalTasks, completedTasks) : 'Planner por usuario'}</span>
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
                <h2>Extratos consolidados</h2>
              </div>
              <span className="card-tag is-live">Novo</span>
            </div>
            <p>
              Importe CSVs de bancos diferentes, consolide os lancamentos e edite a tabela com comandos.
            </p>
            <button type="button" className="card-action" onClick={() => navigateTo('finance')}>
              Entrar
            </button>
          </article>

          <article className="dashboard-card">
            <div className="card-head">
              <div>
                <span className="card-kicker">Configuracoes</span>
                <h2>Tema e assistente</h2>
              </div>
              <span className="card-tag is-live">Novo</span>
            </div>
            <p>Troque a cor do app, abra o assistente analitico e concentre funcoes globais do workspace.</p>
            <button type="button" className="card-action" onClick={() => navigateTo('settings')}>
              Entrar
            </button>
          </article>
        </section>
      </section>
      <div className="app-dock">
        <Dock items={dockItems} {...dockProps} />
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
