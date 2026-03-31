import { randomUUID } from 'node:crypto'
import { defaultDays } from '../data/defaultDays.js'
import { PlannerBoard } from '../models/PlannerBoard.js'

const LEGACY_BOARD_KEY = 'main'
const APP_TIMEZONE = String(process.env.APP_TIMEZONE || 'America/Sao_Paulo').trim() || 'America/Sao_Paulo'
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: APP_TIMEZONE,
})

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  timeZone: APP_TIMEZONE,
})

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: APP_TIMEZONE,
})

const toDateKey = (date = new Date()) => DATE_KEY_FORMATTER.format(date)

const toDateLabel = (date = new Date()) =>
  DATE_FORMATTER.format(date).replace('.', '').replace(' de ', ' ')

const toDayLabel = (date = new Date()) => {
  const weekday = DAY_LABEL_FORMATTER.format(date)
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

const buildDay = (date = new Date()) => ({
  id: randomUUID(),
  dateKey: toDateKey(date),
  label: toDayLabel(date),
  date: toDateLabel(date),
  note: 'Nova nota do dia.',
  tasks: [],
})

const formatBoard = (board) => ({
  days: board.days.map((day) => ({
    id: day.id,
    dateKey: day.dateKey || '',
    label: day.label,
    date: day.date,
    note: day.note,
    tasks: day.tasks.map((task) => ({
      id: task.id,
      text: task.text,
      done: task.done,
    })),
  })),
})

const findDay = (board, dayId) => board.days.find((day) => day.id === dayId)
const findDayByDateKey = (board, dateKey) => board.days.find((day) => day.dateKey === dateKey)
const findLegacyTodayDay = (board) => board.days.find((day) => day.id === 'today')
const findLegacyTomorrowDay = (board) => board.days.find((day) => day.id === 'tomorrow')
const buildBoardKey = (userId) => `planner:${String(userId || '').trim()}`
const isPrimarySeedUser = (username) =>
  String(username || '').trim() === String(process.env.AUTH_SEED_USERNAME || '').trim()
const isLuluUser = (username) =>
  String(username || '').trim() === String(process.env.AUTH_LULU_USERNAME || '').trim()

const cloneDays = (days = []) =>
  days.map((day) => ({
    id: String(day.id || randomUUID()),
    dateKey: String(day.dateKey || ''),
    label: String(day.label || ''),
    date: String(day.date || ''),
    note: String(day.note || 'Nova nota do dia.'),
    tasks: Array.isArray(day.tasks)
      ? day.tasks.map((task) => ({
          id: String(task.id || randomUUID()),
          text: String(task.text || '').trim(),
          done: Boolean(task.done),
        }))
      : [],
  }))

const buildLuluDefaultDays = () => [
  {
    id: randomUUID(),
    dateKey: toDateKey(),
    label: toDayLabel(),
    date: toDateLabel(),
    note: [
      'Prioridades da Lulu para hoje:',
      '- Revisar pendencias do Nova Studio.',
      '- Organizar tarefas pessoais sem misturar com o projeto.',
      '- Fechar os proximos passos mais importantes do dia.',
    ].join('\n'),
    tasks: [
      { id: randomUUID(), text: 'Conferir prioridades do dia.', done: false },
      { id: randomUUID(), text: 'Atualizar o que esta em andamento.', done: false },
      { id: randomUUID(), text: 'Separar uma tarefa pessoal importante.', done: false },
    ],
  },
]

const buildInitialDaysForUser = ({ username }) =>
  isLuluUser(username) ? buildLuluDefaultDays() : cloneDays(defaultDays)

export const getOrCreateBoard = async ({ userId, username }) => {
  const boardKey = buildBoardKey(userId)
  let board = await PlannerBoard.findOne({ key: boardKey })

  if (!board) {
    const legacyBoard = await PlannerBoard.findOne({ key: LEGACY_BOARD_KEY })

    if (legacyBoard && isPrimarySeedUser(username)) {
      legacyBoard.key = boardKey
      await legacyBoard.save()
      board = legacyBoard
    } else {
      board = await PlannerBoard.create({
        key: boardKey,
        days: buildInitialDaysForUser({ username }),
      })
    }
  }

  if (!Array.isArray(board.days) || board.days.length === 0) {
    board.days = buildInitialDaysForUser({ username })
    await board.save()
  }

  return board
}

export const listDays = async (auth) => {
  const board = await getOrCreateBoard(auth)
  return formatBoard(board)
}

export const addDay = async (auth, inputDateKey) => {
  const board = await getOrCreateBoard(auth)
  const date = inputDateKey ? new Date(`${inputDateKey}T12:00:00`) : new Date()

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const dateKey = toDateKey(date)
  const existingDay = findDayByDateKey(board, dateKey)

  if (existingDay) {
    return {
      board: formatBoard(board),
      dayId: existingDay.id,
      created: false,
    }
  }

  const todayDateKey = toDateKey()
  const legacyTodayDay = dateKey === todayDateKey ? findLegacyTodayDay(board) : null

  if (legacyTodayDay) {
    legacyTodayDay.dateKey = todayDateKey
    legacyTodayDay.label = toDayLabel(date)
    legacyTodayDay.date = toDateLabel(date)
    await board.save()

    return {
      board: formatBoard(board),
      dayId: legacyTodayDay.id,
      created: false,
    }
  }

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowDateKey = toDateKey(tomorrowDate)
  const legacyTomorrowDay = dateKey === tomorrowDateKey ? findLegacyTomorrowDay(board) : null

  if (legacyTomorrowDay) {
    legacyTomorrowDay.dateKey = tomorrowDateKey
    legacyTomorrowDay.label = toDayLabel(date)
    legacyTomorrowDay.date = toDateLabel(date)
    await board.save()

    return {
      board: formatBoard(board),
      dayId: legacyTomorrowDay.id,
      created: false,
    }
  }

  const nextDay = buildDay(date)
  board.days.unshift(nextDay)
  await board.save()

  return {
    board: formatBoard(board),
    dayId: nextDay.id,
    created: true,
  }
}

export const ensureTodayDay = async (auth) => addDay(auth, toDateKey())

export const appendNoteToDay = async (auth, dayId, text) => {
  const board = await getOrCreateBoard(auth)
  const day = findDay(board, dayId)

  if (!day) {
    return null
  }

  const nextText = String(text || '').trim()

  if (!nextText) {
    return formatBoard(board)
  }

  const currentNote = String(day.note || '').trim()
  day.note = currentNote && currentNote !== 'Nova nota do dia.'
    ? `${currentNote}\n- ${nextText}`
    : `- ${nextText}`

  await board.save()
  return formatBoard(board)
}

export const removeDay = async (auth, dayId) => {
  const board = await getOrCreateBoard(auth)
  const nextDays = board.days.filter((day) => day.id !== dayId)

  if (nextDays.length === board.days.length) {
    return false
  }

  board.days = nextDays
  await board.save()
  return formatBoard(board)
}

export const addTaskToDay = async (auth, dayId, text) => {
  const board = await getOrCreateBoard(auth)
  const day = findDay(board, dayId)

  if (!day) {
    return null
  }

  day.tasks.push({
    id: randomUUID(),
    text,
    done: false,
  })

  await board.save()
  return formatBoard(board)
}

export const updateTaskState = async (auth, dayId, taskId, done) => {
  const board = await getOrCreateBoard(auth)
  const day = findDay(board, dayId)

  if (!day) {
    return null
  }

  const task = day.tasks.find((item) => item.id === taskId)

  if (!task) {
    return false
  }

  task.done = done
  await board.save()
  return formatBoard(board)
}

export const removeTaskFromDay = async (auth, dayId, taskId) => {
  const board = await getOrCreateBoard(auth)
  const day = findDay(board, dayId)

  if (!day) {
    return null
  }

  const nextTasks = day.tasks.filter((task) => task.id !== taskId)

  if (nextTasks.length === day.tasks.length) {
    return false
  }

  day.tasks = nextTasks
  await board.save()
  return formatBoard(board)
}
