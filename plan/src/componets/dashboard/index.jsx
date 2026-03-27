import { useEffect, useState } from 'react'
import { createTask, deleteTask, fetchDays, updateTask } from '../../lib/plannerApi'
import './styles.css'

const SELECTED_DAY_STORAGE_KEY = 'planner.selectedDayId'

function Dashboard() {
  const [days, setDays] = useState([])
  const [selectedDayId, setSelectedDayId] = useState(() => localStorage.getItem(SELECTED_DAY_STORAGE_KEY) || '')
  const [draftTask, setDraftTask] = useState('')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const activeDayId = days.find((day) => day.id === selectedDayId)?.id ?? days[0]?.id ?? ''
  const selectedDay = days.find((day) => day.id === activeDayId) ?? days[0]
  const completedTasks = selectedDay?.tasks.filter((task) => task.done).length ?? 0
  const pendingTasks = (selectedDay?.tasks.length ?? 0) - completedTasks

  const syncDays = (payload) => {
    const nextDays = payload.days || []
    setDays(nextDays)
    setSelectedDayId((currentSelectedDayId) => {
      if (nextDays.some((day) => day.id === currentSelectedDayId)) {
        return currentSelectedDayId
      }

      return nextDays[0]?.id || ''
    })
  }

  const loadPlanner = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const payload = await fetchDays()
      syncDays(payload)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const runMutation = async (operation) => {
    setIsSaving(true)
    setErrorMessage('')

    try {
      const payload = await operation()
      syncDays(payload)
      return true
    } catch (error) {
      setErrorMessage(error.message)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const addTask = async () => {
    const taskName = draftTask.trim()

    if (!taskName || !activeDayId) {
      return
    }

    const didSave = await runMutation(() => createTask(activeDayId, taskName))

    if (didSave) {
      setDraftTask('')
    }
  }

  const handleTaskSubmit = async (event) => {
    event.preventDefault()
    await addTask()
  }

  const toggleTask = async (taskId, done) => {
    if (!activeDayId) {
      return
    }

    await runMutation(() => updateTask(activeDayId, taskId, done))
  }

  useEffect(() => {
    loadPlanner()
  }, [])

  useEffect(() => {
    if (activeDayId) {
      localStorage.setItem(SELECTED_DAY_STORAGE_KEY, activeDayId)
    }
  }, [activeDayId])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 720) {
        setIsMobilePanelOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleDaySelect = (dayId) => {
    setSelectedDayId(dayId)
    setIsMobilePanelOpen(false)
  }

  const removeTask = async (taskId) => {
    if (!activeDayId) {
      return
    }

    await runMutation(() => deleteTask(activeDayId, taskId))
  }

  if (isLoading) {
    return (
      <section className="daily-page">
        <main className="daily-content">
          <section className="task-panel status-panel">
            <span className="eyebrow">Sincronizando</span>
            <h2>Carregando planner...</h2>
            <p>Aguarde enquanto buscamos seus dados no servidor.</p>
          </section>
        </main>
      </section>
    )
  }

  if (!selectedDay) {
    return (
      <section className="daily-page">
        <main className="daily-content">
          <section className="task-panel status-panel">
            <span className="eyebrow">Planner vazio</span>
            <h2>Nenhum dia disponivel.</h2>
            <p>Verifique a conexao com a API ou reinicie a sincronizacao.</p>
            <button type="button" className="status-action" onClick={loadPlanner}>
              Tentar novamente
            </button>
          </section>
        </main>
      </section>
    )
  }

  const selectedDaySummary = (
    <header className="daily-header">
      <div>
        <span className="eyebrow">Dia selecionado</span>
        <h2>{selectedDay.label}</h2>
        <p>{selectedDay.note}</p>
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
  )

  return (
    <section className="daily-page">
      <aside className="daily-sidebar">
        <div className="sidebar-brand">
          <span className="eyebrow">Planejamento diario</span>
          <h1>Tarefas por dia</h1>
          <p>Selecione um dia no menu lateral para abrir a lista correspondente.</p>
        </div>

        <nav className="day-nav" aria-label="Dias da semana">
          {days.map((day) => {
            const doneCount = day.tasks.filter((task) => task.done).length

            return (
              <button
                key={day.id}
                type="button"
                className={`day-link ${day.id === activeDayId ? 'is-active' : ''}`}
                onClick={() => handleDaySelect(day.id)}
              >
                <div>
                  <strong>{day.label}</strong>
                  <span>{day.date}</span>
                </div>
                <small>{doneCount} feitas</small>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className={`mobile-panel ${isMobilePanelOpen ? 'is-open' : ''}`} aria-hidden={!isMobilePanelOpen}>
        <button
          type="button"
          className="mobile-panel-backdrop"
          aria-label="Fechar painel"
          onClick={() => setIsMobilePanelOpen(false)}
        />

        <div className="mobile-panel-sheet">
          <div className="mobile-panel-topbar">
            <span className="eyebrow">Atalhos do dia</span>
            <button
              type="button"
              className="mobile-panel-close"
              aria-label="Fechar painel"
              onClick={() => setIsMobilePanelOpen(false)}
            >
              Fechar
            </button>
          </div>

          {selectedDaySummary}

          <nav className="day-nav mobile-day-nav" aria-label="Dias da semana">
            {days.map((day) => {
              const doneCount = day.tasks.filter((task) => task.done).length

              return (
                <button
                  key={`${day.id}-mobile`}
                  type="button"
                  className={`day-link ${day.id === activeDayId ? 'is-active' : ''}`}
                  onClick={() => handleDaySelect(day.id)}
                >
                  <div>
                    <strong>{day.label}</strong>
                    <span>{day.date}</span>
                  </div>
                  <small>{doneCount} feitas</small>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <main className="daily-content">
        {selectedDaySummary}

        <section className="task-panel">
          {errorMessage ? (
            <div className="feedback-banner" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <div className="panel-heading">
            <div>
              <span className="eyebrow">Lista do dia</span>
              <h3>{selectedDay.date}</h3>
            </div>

            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Abrir painel do dia"
              aria-expanded={isMobilePanelOpen}
              onClick={() => setIsMobilePanelOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <form className="task-form" onSubmit={handleTaskSubmit}>
            <label className="sr-only" htmlFor="new-task">
              Nova tarefa
            </label>
            <input
              id="new-task"
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

          <div className="task-list">
            {selectedDay.tasks.map((task) => (
              <div key={task.id} className={`task-item ${task.done ? 'is-done' : ''}`}>
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={isSaving}
                    onChange={() => toggleTask(task.id, !task.done)}
                  />
                  <span>{task.text}</span>
                </label>

                <button
                  type="button"
                  className="task-remove"
                  disabled={isSaving}
                  onClick={() => removeTask(task.id)}
                  aria-label={`Remover tarefa ${task.text}`}
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

export default Dashboard
