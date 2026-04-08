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
const buildBoardKey = (userId) => `planner:${String(userId || '').trim()}`
const isPrimarySeedUser = (username) =>
  String(username || '').trim() === String(process.env.AUTH_SEED_USERNAME || '').trim()
const isLuluUser = (username) =>
  String(username || '').trim() === String(process.env.AUTH_LULU_USERNAME || '').trim()
const isBetiUser = (username) =>
  String(username || '').trim() === String(process.env.AUTH_BETI_USERNAME || '').trim()

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

const LEGACY_DAY_IDS = new Set(['today', 'tomorrow', 'monday', 'tuesday'])
const LEGACY_MONTH_INDEX = {
  jan: 0,
  fev: 1,
  feb: 1,
  mar: 2,
  abr: 3,
  apr: 3,
  mai: 4,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  aug: 7,
  set: 8,
  sep: 8,
  out: 9,
  oct: 9,
  nov: 10,
  dez: 11,
  dec: 11,
}

const buildDateFromOffset = (offset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date
}

const parseLegacyDate = (value) => {
  const normalizedValue = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  const match = normalizedValue.match(/^(\d{1,2})\s+([a-z]{3,})$/)

  if (!match) {
    return null
  }

  const [, dayValue, monthLabel] = match
  const monthIndex = LEGACY_MONTH_INDEX[monthLabel.slice(0, 3)]

  if (monthIndex === undefined) {
    return null
  }

  const now = new Date()
  const year = now.getFullYear()
  const parsedDate = new Date(year, monthIndex, Number(dayValue), 12, 0, 0, 0)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  // Legacy labels like "26 Mar" are historical cards. Keep them in the past
  // when the current year's date would fall ahead of the current week.
  const oneWeekAhead = buildDateFromOffset(7)

  if (parsedDate > oneWeekAhead) {
    parsedDate.setFullYear(parsedDate.getFullYear() - 1)
  }

  return parsedDate
}

const buildSeedDaySignature = (day) => {
  const note = String(day?.note || '').trim()
  const tasks = Array.isArray(day?.tasks)
    ? day.tasks.map((task) => String(task?.text || '').trim()).filter(Boolean)
    : []

  return JSON.stringify({ note, tasks })
}

const DEFAULT_DAY_SIGNATURES = new Map(
  defaultDays.map((day) => [buildSeedDaySignature(day), day]),
)

const normalizeLegacyBoardDays = (board) => {
  if (!Array.isArray(board.days) || board.days.length === 0) {
    return false
  }

  const hasLegacyShape = board.days.some((day) => {
    const id = String(day?.id || '').trim()
    return LEGACY_DAY_IDS.has(id) || !String(day?.dateKey || '').trim()
  })

  if (!hasLegacyShape) {
    return false
  }

  board.days = board.days.map((day, index) => {
    const nextDate = parseLegacyDate(day?.date) || buildDateFromOffset(index - board.days.length)

    return {
      ...day,
      id: randomUUID(),
      dateKey: toDateKey(nextDate),
      label: toDayLabel(nextDate),
      date: toDateLabel(nextDate),
    }
  })

  return true
}

const repairMigratedSeedDays = (board) => {
  if (!Array.isArray(board.days) || board.days.length === 0) {
    return false
  }

  let hasChanges = false

  board.days = board.days.map((day, index) => {
    const matchedDefaultDay = DEFAULT_DAY_SIGNATURES.get(buildSeedDaySignature(day))

    if (!matchedDefaultDay) {
      return day
    }

    const expectedDate = parseLegacyDate(matchedDefaultDay.date) || buildDateFromOffset(index - board.days.length)
    const expectedDateKey = toDateKey(expectedDate)
    const expectedLabel = toDayLabel(expectedDate)
    const expectedDateLabel = toDateLabel(expectedDate)

    if (
      String(day.dateKey || '') === expectedDateKey
      && String(day.label || '') === expectedLabel
      && String(day.date || '') === expectedDateLabel
    ) {
      return day
    }

    hasChanges = true

    return {
      ...day,
      dateKey: expectedDateKey,
      label: expectedLabel,
      date: expectedDateLabel,
    }
  })

  return hasChanges
}

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

const buildBetiDefaultDays = () => [
  {
    id: randomUUID(),
    dateKey: toDateKey(),
    label: toDayLabel(),
    date: toDateLabel(),
    note: [
      'Inicio do planner da Beti:',
      '- Escolher as 3 prioridades principais do dia.',
      '- Marcar o que ja foi resolvido.',
      '- Usar este espaco para anotar recados e proximos passos.',
    ].join('\n'),
    tasks: [
      { id: randomUUID(), text: 'Revisar compromissos de hoje.', done: false },
      { id: randomUUID(), text: 'Separar uma prioridade pessoal importante.', done: false },
      { id: randomUUID(), text: 'Registrar uma anotacao no planner.', done: false },
    ],
  },
]

const ensureBetiStarterDay = (board, username) => {
  if (!isBetiUser(username)) {
    return false
  }

  const todayDateKey = toDateKey()

  if (findDayByDateKey(board, todayDateKey)) {
    return false
  }

  const [starterDay] = buildBetiDefaultDays()
  board.days.unshift(starterDay)
  return true
}

const buildInitialDaysForUser = ({ username }) => {
  if (isLuluUser(username)) {
    return buildLuluDefaultDays()
  }

  if (isBetiUser(username)) {
    return buildBetiDefaultDays()
  }

  return cloneDays(defaultDays)
}

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

  if (normalizeLegacyBoardDays(board)) {
    await board.save()
  }

  if (repairMigratedSeedDays(board)) {
    await board.save()
  }

  if (ensureBetiStarterDay(board, username)) {
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
