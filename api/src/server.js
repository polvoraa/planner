import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import {
  authenticateUser,
  clearSessionCookie,
  createSessionForUser,
  ensureSeedAdmin,
  invalidateSession,
  readSession,
  requireAuth,
} from './services/authService.js'
import {
  addTaskToDay,
  addDay,
  ensureTodayDay,
  listDays,
  removeDay,
  removeTaskFromDay,
  updateTaskState,
} from './services/plannerService.js'
import { listResponses, markResponsesAsRead } from './services/responseService.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const mongoUri = process.env.MONGODB_URI
const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

if (!mongoUri) {
  throw new Error('MONGODB_URI nao configurado.')
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origem nao permitida por CORS.'))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/auth/session', async (request, response, next) => {
  try {
    const session = await readSession(request)
    response.json({
      authenticated: Boolean(session),
      user: session
        ? { id: session.userId, username: session.username, role: session.role }
        : null,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', async (request, response, next) => {
  const username = String(request.body?.username || '').trim()
  const password = String(request.body?.password || '')

  if (!username || !password) {
    response.status(400).json({ message: 'Usuario e senha sao obrigatorios.' })
    return
  }

  try {
    const user = await authenticateUser({ username, password })

    if (!user) {
      response.status(401).json({ message: 'Credenciais invalidas.' })
      return
    }

    response.setHeader('Set-Cookie', await createSessionForUser(user._id.toString()))
    response.json({
      authenticated: true,
      user: { id: user._id.toString(), username: user.username, role: user.role },
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    await invalidateSession(request)
  } catch (error) {
    next(error)
    return
  }

  response.setHeader('Set-Cookie', clearSessionCookie())
  response.json({ authenticated: false })
})

app.get('/api/days', async (_request, response, next) => {
  try {
    const data = await listDays()
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.get('/api/responses', requireAuth, async (request, response, next) => {
  try {
    const data = await listResponses({
      source: request.query.source,
      search: request.query.search,
      limit: request.query.limit,
    })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/responses/read', requireAuth, async (request, response, next) => {
  try {
    const ids = Array.isArray(request.body?.ids) ? request.body.ids : []
    const read = typeof request.body?.read === 'boolean' ? request.body.read : true
    const data = await markResponsesAsRead({ ids, read })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/days', async (request, response, next) => {
  try {
    const data = await addDay(request.body?.dateKey)

    if (data === false) {
      response.status(400).json({ message: 'Data invalida.' })
      return
    }

    response.status(data.created ? 201 : 200).json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/days/today', async (_request, response, next) => {
  try {
    const data = await ensureTodayDay()
    response.status(data.created ? 201 : 200).json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/days/:dayId', async (request, response, next) => {
  try {
    const data = await removeDay(request.params.dayId)

    if (data === false) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/days/:dayId/tasks', async (request, response, next) => {
  const text = String(request.body?.text || '').trim()

  if (!text) {
    response.status(400).json({ message: 'O texto da tarefa e obrigatorio.' })
    return
  }

  try {
    const data = await addTaskToDay(request.params.dayId, text)

    if (!data) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/days/:dayId/tasks/:taskId', async (request, response, next) => {
  if (typeof request.body?.done !== 'boolean') {
    response.status(400).json({ message: 'O campo done deve ser booleano.' })
    return
  }

  try {
    const data = await updateTaskState(
      request.params.dayId,
      request.params.taskId,
      request.body.done,
    )

    if (data === null) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    if (data === false) {
      response.status(404).json({ message: 'Tarefa nao encontrada.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/days/:dayId/tasks/:taskId', async (request, response, next) => {
  try {
    const data = await removeTaskFromDay(request.params.dayId, request.params.taskId)

    if (data === null) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    if (data === false) {
      response.status(404).json({ message: 'Tarefa nao encontrada.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Erro interno do servidor.' })
})

const startServer = async () => {
  await mongoose.connect(mongoUri)
  await ensureSeedAdmin()
  app.listen(port, () => {
    console.log(`Planner API ativa em http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Falha ao iniciar a API:', error)
  process.exit(1)
})
