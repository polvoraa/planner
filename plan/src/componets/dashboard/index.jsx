import { useEffect, useState } from 'react'
import './styles.css'

const STORAGE_KEY = 'planner.days'
const SELECTED_DAY_STORAGE_KEY = 'planner.selectedDayId'

const initialDays = [
  {
    id: 'today',
    label: 'Hoje',
    date: '26 Mar',
    note: 'Fechar prioridades do dia e remover bloqueios antes do fim da tarde.',
    tasks: [
      { id: 1, text: 'Atualizar status do projeto Atlas', done: true },
      { id: 2, text: 'Revisar tarefas da sprint com o time', done: false },
      { id: 3, text: 'Enviar notas da daily para stakeholders', done: false },
    ],
  },
  {
    id: 'tomorrow',
    label: 'Amanha',
    date: '27 Mar',
    note: 'Preparar backlog da semana e consolidar entregas do squad.',
    tasks: [
      { id: 4, text: 'Planejar kickoff da sprint 13', done: false },
      { id: 5, text: 'Organizar pendencias de QA', done: false },
    ],
  },
  {
    id: 'monday',
    label: 'Segunda',
    date: '30 Mar',
    note: 'Abrir a semana com foco em prioridades de execucao e alinhamento.',
    tasks: [
      { id: 6, text: 'Definir objetivo semanal do produto', done: false },
    ],
  },
  {
    id: 'tuesday',
    label: 'Terca',
    date: '31 Mar',
    note: 'Dia ideal para revisoes, dependencias e checkpoints tecnicos.',
    tasks: [
      { id: 7, text: 'Revisar escopo com engenharia', done: false },
    ],
  },
]

const loadDays = () => {
  const savedDays = localStorage.getItem(STORAGE_KEY)

  if (!savedDays) {
    return initialDays
  }

  try {
    return JSON.parse(savedDays)
  } catch {
    return initialDays
  }
}

function Dashboard() {
  const [days, setDays] = useState(loadDays)
  const [selectedDayId, setSelectedDayId] = useState(() => {
    const storedDays = loadDays()
    const savedSelectedDayId = localStorage.getItem(SELECTED_DAY_STORAGE_KEY)

    if (savedSelectedDayId && storedDays.some((day) => day.id === savedSelectedDayId)) {
      return savedSelectedDayId
    }

    return storedDays[0]?.id ?? initialDays[0].id
  })
  const [draftTask, setDraftTask] = useState('')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  const activeDayId =
    days.find((day) => day.id === selectedDayId)?.id ?? days[0]?.id ?? initialDays[0].id
  const selectedDay = days.find((day) => day.id === activeDayId) ?? days[0]
  const completedTasks = selectedDay.tasks.filter((task) => task.done).length
  const pendingTasks = selectedDay.tasks.length - completedTasks

  const addTask = () => {
    const taskName = draftTask.trim()

    if (!taskName) {
      return
    }

    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              tasks: [
                ...day.tasks,
                { id: Date.now(), text: taskName, done: false },
              ],
            }
          : day,
      ),
    )
    setDraftTask('')
  }

  const handleTaskSubmit = (event) => {
    event.preventDefault()
    addTask()
  }

  const toggleTask = (taskId) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task,
              ),
            }
          : day,
      ),
    )
  }

  const removeTask = (taskId) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === activeDayId
          ? {
              ...day,
              tasks: day.tasks.filter((task) => task.id !== taskId),
            }
          : day,
      ),
    )
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days))
  }, [days])

  useEffect(() => {
    localStorage.setItem(SELECTED_DAY_STORAGE_KEY, activeDayId)
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
            />
            <button type="button" onClick={addTask}>
              Adicionar
            </button>
          </form>

          <div className="task-list">
            {selectedDay.tasks.map((task) => (
              <div key={task.id} className={`task-item ${task.done ? 'is-done' : ''}`}>
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span>{task.text}</span>
                </label>

                <button
                  type="button"
                  className="task-remove"
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
