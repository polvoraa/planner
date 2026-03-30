import { useEffect, useMemo, useState } from 'react'
import {
  createProject,
  createProjectNote,
  createProjectTask,
  deleteProject,
  deleteProjectNote,
  deleteProjectTask,
  fetchProjects,
  logout,
  updateProjectTask,
} from '../../lib/plannerApi'

const SELECTED_PROJECT_STORAGE_KEY = 'planner.selectedProjectId'

function ProjectsHub({ user, onLogout, onBack }) {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY) || '',
  )
  const [draftProject, setDraftProject] = useState('')
  const [draftTask, setDraftTask] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const syncProjects = (payload) => {
    const nextProjects = payload.workspace?.projects || payload.projects || []
    setProjects(nextProjects)
    setSelectedProjectId((currentSelectedProjectId) => {
      if (nextProjects.some((project) => project.id === currentSelectedProjectId)) {
        return currentSelectedProjectId
      }

      return nextProjects.find((project) => project.slug === 'nova-studio')?.id || nextProjects[0]?.id || ''
    })
  }

  const loadProjects = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const payload = await fetchProjects()
      syncProjects(payload)
    } catch (error) {
      setProjects([])
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, selectedProjectId)
    }
  }, [selectedProjectId])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 720) {
        setIsMobilePanelOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const activeProject = useMemo(
    () =>
      projects.find((project) => project.id === selectedProjectId) ||
      projects.find((project) => project.slug === 'nova-studio') ||
      projects[0] ||
      null,
    [projects, selectedProjectId],
  )

  const completedTasks = activeProject?.tasks.filter((task) => task.done).length ?? 0
  const pendingTasks = (activeProject?.tasks.length ?? 0) - completedTasks

  const selectedProjectSummary = activeProject ? (
    <header className="daily-header project-summary-card">
      <div>
        <span className="eyebrow">Projeto selecionado</span>
        <h2>{activeProject.name}</h2>
        <p>Tarefas compartilhadas com checkbox e anotacoes simples em lista.</p>
      </div>

      <div className="daily-stats">
        <article>
          <span>Concluidas</span>
          <strong>{completedTasks}</strong>
        </article>
        <article>
          <span>Pendentes</span>
          <strong>{pendingTasks}</strong>
        </article>
      </div>
    </header>
  ) : null

  const runMutation = async (operation, options = {}) => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const payload = await operation()
      syncProjects(payload)

      if (options.selectProjectId) {
        const nextProjectId = options.selectProjectId(payload)
        if (nextProjectId) {
          setSelectedProjectId(nextProjectId)
        }
      }

      return payload
    } catch (error) {
      setErrorMessage(error.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      onLogout?.()
    }
  }

  const handleCreateProject = async (event) => {
    event.preventDefault()
    const name = draftProject.trim()

    if (!name) {
      return
    }

    const payload = await runMutation(() => createProject(name), {
      selectProjectId: (result) => result.projectId,
    })

    if (payload) {
      setDraftProject('')
    }
  }

  const handleAddTask = async (event) => {
    event.preventDefault()
    const text = draftTask.trim()

    if (!text || !activeProject?.id) {
      return
    }

    const payload = await runMutation(() => createProjectTask(activeProject.id, text))

    if (payload) {
      setDraftTask('')
    }
  }

  const handleAddNote = async (event) => {
    event.preventDefault()
    const text = draftNote.trim()

    if (!text || !activeProject?.id) {
      return
    }

    const payload = await runMutation(() => createProjectNote(activeProject.id, text))

    if (payload) {
      setDraftNote('')
    }
  }

  if (isLoading) {
    return (
      <section className="projects-page">
        <main className="projects-content">
          <section className="project-card">
            <span className="hero-kicker">Sincronizando</span>
            <h2>Carregando projetos...</h2>
            <p>Aguarde enquanto buscamos os dados compartilhados do workspace.</p>
          </section>
        </main>
      </section>
    )
  }

  if (!activeProject) {
    return (
      <section className="projects-page">
        <aside className="projects-sidebar">
          <div className="projects-sidebar-copy">
            <span className="hero-kicker">Projetos internos</span>
            <h1>Projetos</h1>
            <p>Crie o primeiro projeto para liberar tarefas e anotacoes compartilhadas.</p>
            <div className="responses-auth-row">
              <span className="responses-user-chip">{user?.username || 'Sessao ativa'}</span>
              <button type="button" className="sidebar-ghost-action" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>

          <form className="task-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={draftProject}
              onChange={(event) => setDraftProject(event.target.value)}
              placeholder="Adicionar projeto"
              disabled={isSaving}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>
        </aside>

        <main className="projects-content">
          {errorMessage ? (
            <div className="feedback-banner" role="alert">
              {errorMessage}
            </div>
          ) : null}
        </main>
      </section>
    )
  }

  return (
    <section className="projects-page">
      <aside className="projects-sidebar">
        <div className="projects-sidebar-copy">
          <span className="hero-kicker">Projetos internos</span>
          <h1>{activeProject.name}</h1>
          <p>Selecione um projeto, adicione tarefas e mantenha uma lista separada de anotacoes.</p>
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

        <form className="task-form" onSubmit={handleCreateProject}>
          <input
            type="text"
            value={draftProject}
            onChange={(event) => setDraftProject(event.target.value)}
            placeholder="Adicionar projeto"
            disabled={isSaving}
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>

        <nav className="day-nav" aria-label="Projetos">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`day-link ${project.id === activeProject.id ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedProjectId(project.id)
                setIsMobilePanelOpen(false)
              }}
            >
              <div>
                <strong>{project.name}</strong>
                <span>{project.tasks.length} tarefas</span>
              </div>
              <small>{project.notes.length} notas</small>
            </button>
          ))}
        </nav>
      </aside>

        <main className="projects-content">
          {errorMessage ? (
            <div className="feedback-banner" role="alert">
              {errorMessage}
            </div>
          ) : null}

        {selectedProjectSummary}

        <div className={`mobile-panel project-mobile-panel ${isMobilePanelOpen ? 'is-open' : ''}`} aria-hidden={!isMobilePanelOpen}>
          <button
            type="button"
            className="mobile-panel-backdrop"
            aria-label="Fechar painel"
            onClick={() => setIsMobilePanelOpen(false)}
          />

          <div className="mobile-panel-sheet">
            <div className="mobile-panel-topbar">
              <span className="eyebrow">Atalhos do projeto</span>
              <div className="mobile-topbar-actions">
                {onBack ? (
                  <button type="button" className="mobile-panel-close" onClick={onBack}>
                    Dashboard
                  </button>
                ) : null}
                <button
                  type="button"
                  className="mobile-panel-close"
                  aria-label="Fechar painel"
                  onClick={() => setIsMobilePanelOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>

            {selectedProjectSummary}

            <nav className="day-nav mobile-day-nav" aria-label="Projetos">
              {projects.map((project) => (
                <button
                  key={`${project.id}-mobile`}
                  type="button"
                  className={`day-link ${project.id === activeProject.id ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedProjectId(project.id)
                    setIsMobilePanelOpen(false)
                  }}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <span>{project.tasks.length} tarefas</span>
                  </div>
                  <small>{project.notes.length} notas</small>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Lista de tarefas</span>
              <h3>{activeProject.name}</h3>
            </div>

            <div className="panel-actions">
              <button
                type="button"
                className="day-delete-button"
                disabled={isSaving}
                onClick={() => runMutation(() => deleteProject(activeProject.id))}
              >
                Remover projeto
              </button>
              <button
                type="button"
                className="mobile-menu-button"
                aria-label="Abrir painel do projeto"
                aria-expanded={isMobilePanelOpen}
                onClick={() => setIsMobilePanelOpen(true)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>

          <form className="task-form project-task-form" onSubmit={handleAddTask}>
            <input
              type="text"
              value={draftTask}
              onChange={(event) => setDraftTask(event.target.value)}
              placeholder="Adicionar tarefa"
              disabled={isSaving}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>

          <div className="task-list project-task-list">
            {activeProject.tasks.map((task) => (
              <div key={task.id} className={`task-item project-task-item ${task.done ? 'is-done' : ''}`}>
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={isSaving}
                    onChange={() => runMutation(() => updateProjectTask(activeProject.id, task.id, !task.done))}
                  />
                  <span>{task.text}</span>
                </label>

                <button
                  type="button"
                  className="task-remove"
                  disabled={isSaving}
                  onClick={() => runMutation(() => deleteProjectTask(activeProject.id, task.id))}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="task-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Lista de anotacoes</span>
              <h3>{activeProject.name}</h3>
            </div>
          </div>

          <form className="task-form project-task-form" onSubmit={handleAddNote}>
            <input
              type="text"
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Adicionar anotacao"
              disabled={isSaving}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>

          <div className="task-list project-task-list">
            {activeProject.notes.map((note) => (
              <div key={note.id} className="task-item project-task-item project-note-item">
                <div className="project-note-copy">
                  <span>{note.text}</span>
                </div>

                <button
                  type="button"
                  className="task-remove"
                  disabled={isSaving}
                  onClick={() => runMutation(() => deleteProjectNote(activeProject.id, note.id))}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </section>
  )
}

export default ProjectsHub
