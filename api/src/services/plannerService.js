import { randomUUID } from 'node:crypto'
import { defaultDays } from '../data/defaultDays.js'
import { PlannerBoard } from '../models/PlannerBoard.js'

const BOARD_KEY = 'main'
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

export const getOrCreateBoard = async () => {
  let board = await PlannerBoard.findOne({ key: BOARD_KEY })

  if (!board) {
    board = await PlannerBoard.create({
      key: BOARD_KEY,
      days: defaultDays,
    })
  }

  return board
}

export const listDays = async () => {
  const board = await getOrCreateBoard()
  return formatBoard(board)
}

export const addDay = async (inputDateKey) => {
  const board = await getOrCreateBoard()
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

export const ensureTodayDay = async () => addDay(toDateKey())

export const appendNoteToDay = async (dayId, text) => {
  const board = await getOrCreateBoard()
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

export const removeDay = async (dayId) => {
  const board = await getOrCreateBoard()
  const nextDays = board.days.filter((day) => day.id !== dayId)

  if (nextDays.length === board.days.length) {
    return false
  }

  board.days = nextDays
  await board.save()
  return formatBoard(board)
}

export const addTaskToDay = async (dayId, text) => {
  const board = await getOrCreateBoard()
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

export const updateTaskState = async (dayId, taskId, done) => {
  const board = await getOrCreateBoard()
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

export const removeTaskFromDay = async (dayId, taskId) => {
  const board = await getOrCreateBoard()
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
