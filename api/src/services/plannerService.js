import { randomUUID } from 'node:crypto'
import { defaultDays } from '../data/defaultDays.js'
import { PlannerBoard } from '../models/PlannerBoard.js'

const BOARD_KEY = 'main'

const formatBoard = (board) => ({
  days: board.days.map((day) => ({
    id: day.id,
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
