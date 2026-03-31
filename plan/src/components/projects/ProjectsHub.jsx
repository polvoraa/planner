import { useEffect, useMemo, useState } from 'react'
import {
  applyProjectAiCommand,
  createProject,
  createProjectNote,
  createProjectTask,
  deleteProject,
  deleteProjectNote,
  deleteProjectTask,
  fetchProjects,
  logout,
  previewProjectAiCommand,
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
  const [aiCommand, setAiCommand] = useState('')
  const [aiPreview, setAiPreview] = useState(null)
  const [aiMessage, setAiMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isApplyingAi, setIsApplyingAi] = useState(false)
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

  const isBusy = isSaving || isAiLoading || isApplyingAi

  useEffect(() => {
    setAiPreview(null)
    setAiMessage('')
  }, [activeProject?.id])

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
    setAiMessage('')

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

  const handleGenerateAiPreview = async (event) => {
    event.preventDefault()

    const command = aiCommand.trim()

    if (!command || !activeProject?.id) {
      return
    }

    setIsAiLoading(true)
    setErrorMessage('')
    setAiMessage('')

    try {
      const payload = await previewProjectAiCommand({
        command,
        currentProjectId: activeProject.id,
      })

      setAiPreview(payload)
    } catch (error) {
      setAiPreview(null)
      setErrorMessage(error.message)
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleApplyAiPreview = async () => {
    if (!aiPreview) {
      return
    }

    setIsApplyingAi(true)
    setErrorMessage('')
    setAiMessage('')

    try {
      const payload = await applyProjectAiCommand(aiPreview)
      syncProjects(payload)

      if (payload.applied?.targetProject?.id) {
        setSelectedProjectId(payload.applied.targetProject.id)
      }

      const created = payload.applied?.created || {}
      const createdCount =
        (created.projectTasks || 0) +
        (created.projectNotes || 0) +
        (created.dailyNotes || 0)

      setAiPreview(null)
      setAiCommand('')
      setAiMessage(
        createdCount
          ? `IA aplicada com ${createdCount} item(ns) criado(s).`
          : 'Nenhum item novo foi aplicado.',
      )
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsApplyingAi(false)
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
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy}>
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
            disabled={isBusy}
          />
          <button type="submit" disabled={isBusy}>
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

          {aiMessage ? (
            <div className="feedback-banner feedback-banner-success" role="status">
              {aiMessage}
            </div>
          ) : null}

        {selectedProjectSummary}

        <section className="task-panel ai-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Assistente com IA</span>
              <h3>Comando natural para {activeProject.name}</h3>
            </div>
          </div>

          <form className="task-form ai-command-form" onSubmit={handleGenerateAiPreview}>
            <textarea
              value={aiCommand}
              onChange={(event) => setAiCommand(event.target.value)}
              placeholder="Ex.: adiciona fazer posts, conseguir clientes e revisar proposta no Nova Studio"
              disabled={isBusy}
              rows={4}
            />
            <button type="submit" disabled={isBusy || !aiCommand.trim()}>
              {isAiLoading ? 'Analisando...' : 'Analisar com IA'}
            </button>
          </form>

          {aiPreview ? (
            <div className="ai-preview-card">
              <div className="ai-preview-head">
                <div>
                  <span className="eyebrow">Preview</span>
                  <strong>
                    {aiPreview.targetProject?.name
                      ? `Destino principal: ${aiPreview.targetProject.name}`
                      : 'Sem projeto definido'}
                  </strong>
                </div>
                <span className="card-tag">Groq</span>
              </div>

              <div className="ai-preview-list">
                {aiPreview.actions?.map((action, index) => (
                  <article key={`${action.type}-${index}-${action.text}`} className="ai-preview-item">
                    <div>
                      <strong>{formatAiActionLabel(action.type)}</strong>
                      <p>{action.text}</p>
                    </div>
                    <small>{formatAiDestination(action)}</small>
                  </article>
                ))}
              </div>

              {aiPreview.warnings?.length ? (
                <div className="ai-preview-warnings">
                  {aiPreview.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}

              <div className="ai-preview-actions">
                <button
                  type="button"
                  className="sidebar-action is-primary"
                  disabled={isBusy || !hasApplicableAiAction(aiPreview)}
                  onClick={handleApplyAiPreview}
                >
                  {isApplyingAi ? 'Aplicando...' : 'Aplicar sugestoes'}
                </button>
                <button
                  type="button"
                  className="sidebar-ghost-action ai-reset-button"
                  disabled={isBusy}
                  onClick={() => setAiPreview(null)}
                >
                  Limpar preview
                </button>
              </div>
            </div>
          ) : null}
        </section>

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
                disabled={isBusy}
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
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy}>
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
                    disabled={isBusy}
                    onChange={() => runMutation(() => updateProjectTask(activeProject.id, task.id, !task.done))}
                  />
                  <span>{task.text}</span>
                </label>

                <button
                  type="button"
                  className="task-remove"
                  disabled={isBusy}
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
              disabled={isBusy}
            />
            <button type="submit" disabled={isBusy}>
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
                  disabled={isBusy}
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

const formatAiActionLabel = (type) => {
  switch (type) {
    case 'project_task':
      return 'Tarefa do projeto'
    case 'project_note':
      return 'Anotacao do projeto'
    case 'daily_task':
      return 'Tarefa do dia'
    case 'personal_note':
      return 'Item pessoal'
    default:
      return 'Sugestao'
  }
}

const formatAiDestination = (action) => {
  if (action.destination === 'project') {
    return action.projectName || 'Projeto'
  }

  if (action.destination === 'daily') {
    return action.destinationLabel || 'Nota do dia de hoje'
  }

  return action.reason || 'Nao sera aplicado'
}

const hasApplicableAiAction = (preview) =>
  (preview?.actions || []).some((action) => action.destination === 'project' || action.destination === 'daily')

export default ProjectsHub
