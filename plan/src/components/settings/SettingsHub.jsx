import { logout } from '../../lib/plannerApi'

function SettingsHub({ user, onBack, onLogout, activeTheme, onThemeChange, onOpenAssistant }) {
  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onLogout?.()
    }
  }

  return (
    <section className="projects-page settings-page">
      <aside className="projects-sidebar settings-sidebar">
        <div className="projects-sidebar-copy">
          <span className="hero-kicker">Configuracoes</span>
          <h1>Visual e atalhos</h1>
          <p>
            Ajuste a identidade do app, mantenha o workspace com a sua cara e abra o assistente com
            contexto completo sempre que precisar analisar os dados.
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
            <span>Tema ativo</span>
            <strong>{THEME_LABELS[activeTheme] || 'Custom'}</strong>
          </article>
          <article className="responses-metric-card">
            <span>Assistente IA</span>
            <strong>Online</strong>
          </article>
        </div>
      </aside>

      <main className="projects-content settings-content">
        <section className="task-panel settings-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Tema</span>
              <h3>Trocar a cor principal do app</h3>
            </div>
          </div>

          <div className="theme-grid">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-card ${activeTheme === theme.id ? 'is-active' : ''}`}
                onClick={() => onThemeChange?.(theme.id)}
              >
                <div className="theme-swatches">
                  {theme.swatches.map((swatch) => (
                    <span key={swatch} style={{ background: swatch }} />
                  ))}
                </div>
                <strong>{theme.name}</strong>
                <p>{theme.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="task-panel settings-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Funcionalidades</span>
              <h3>Assistente IA do workspace</h3>
            </div>
          </div>

          <div className="settings-feature-card">
            <div>
              <strong>Analise planner, projetos, respostas e financeiro na mesma conversa.</strong>
              <p>
                A pagina do assistente usa a IA ja integrada ao backend e consulta os dados consolidados
                do app para responder perguntas analiticas.
              </p>
            </div>
            <button type="button" className="sidebar-action is-primary" onClick={onOpenAssistant}>
              Abrir assistente IA
            </button>
          </div>
        </section>
      </main>
    </section>
  )
}

const THEMES = [
  {
    id: 'ember',
    name: 'Ember',
    description: 'Laranja queimado com contraste quente e foco em destaque.',
    swatches: ['#ff8a3d', '#ff6a00', '#2a2a2a'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Azul petróleo com acento frio e leitura mais técnica.',
    swatches: ['#6bc9ff', '#1386d3', '#182431'],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Verde profundo com sensação mais calma e operacional.',
    swatches: ['#87d387', '#2f9e62', '#17231a'],
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Vermelho rosado controlado para um visual mais editorial.',
    swatches: ['#ff9ca4', '#d95b6a', '#2a1b20'],
  },
]

const THEME_LABELS = THEMES.reduce((accumulator, theme) => {
  accumulator[theme.id] = theme.name
  return accumulator
}, {})

export default SettingsHub
