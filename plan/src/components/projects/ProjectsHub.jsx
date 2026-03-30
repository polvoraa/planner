import { useEffect, useMemo, useState } from 'react'
import { fetchProjects, logout } from '../../lib/plannerApi'

function ProjectsHub({ user, onLogout, onBack }) {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onLogout?.()
    }
  }

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const payload = await fetchProjects()
        setProjects(payload.projects || [])
      } catch (error) {
        setProjects([])
        setErrorMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [])

  const activeProject = useMemo(
    () => projects.find((project) => project.slug === 'nova-studio') || projects[0] || null,
    [projects],
  )

  return (
    <section className="projects-page">
      <aside className="projects-sidebar">
        <div className="projects-sidebar-copy">
          <span className="hero-kicker">Projetos internos</span>
          <h1>{activeProject?.name || 'Projetos'}</h1>
          <p>
            Area reservada para acompanhar tarefas e anotacoes do projeto ativo sem misturar com o
            restante do workspace.
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
      </aside>

      <main className="projects-content">
        {errorMessage ? (
          <div className="feedback-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <section className="project-card">
            <span className="hero-kicker">Sincronizando</span>
            <h2>Carregando projeto...</h2>
            <p>Aguarde enquanto buscamos os dados compartilhados do workspace.</p>
          </section>
        ) : null}

        {!isLoading && !activeProject ? (
          <section className="project-card">
            <span className="hero-kicker">Sem projeto</span>
            <h2>Nenhum projeto disponivel.</h2>
            <p>Quando houver dados salvos na API, eles aparecem aqui no web e no mobile.</p>
          </section>
        ) : null}

        {!isLoading && activeProject ? (
          <>
        <section className="project-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Tarefas</span>
              <h2>{activeProject.name}</h2>
            </div>
            <span className="card-tag is-live">Ativo</span>
          </div>
          <div className="project-list">
            {activeProject.tasks.map((task) => (
              <article key={task} className="project-list-item">
                <span className="project-list-bullet" aria-hidden="true">
                  -
                </span>
                <p>{task}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="project-card">
          <div className="card-head">
            <div>
              <span className="card-kicker">Anotacoes</span>
              <h2>Contexto do projeto</h2>
            </div>
          </div>
          <div className="project-list">
            {activeProject.notes.map((note) => (
              <article key={note} className="project-list-item">
                <span className="project-list-bullet" aria-hidden="true">
                  -
                </span>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </section>
          </>
        ) : null}
      </main>
    </section>
  )
}

export default ProjectsHub
