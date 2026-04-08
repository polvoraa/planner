import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import {
  authenticateUser,
  createApiTokenForUser,
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
import {
  listResponses,
  markResponsesAsRead,
  processUnreadResponseNotifications,
} from './services/responseService.js'
import {
  addProject,
  addProjectNote,
  addProjectTask,
  listProjects,
  removeProject,
  removeProjectNote,
  removeProjectTask,
  updateProjectTaskState,
} from './services/projectService.js'
import {
  applyProjectCommandPreview,
  generateProjectCommandPreview,
} from './services/aiService.js'
import { askWorkspaceAssistant, listAssistantContext } from './services/assistantService.js'
import {
  applyFinanceCommand,
  importFinanceCsv,
  listFinanceWorkspace,
  previewFinanceCommand,
  removeFinanceImport,
} from './services/financeService.js'

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

app.post('/api/mobile/auth/login', async (request, response, next) => {
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

    const token = await createApiTokenForUser(user._id.toString())
    response.json({
      authenticated: true,
      token,
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

app.get('/api/days', requireAuth, async (request, response, next) => {
  try {
    const data = await listDays(request.auth)
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

app.get('/api/projects', requireAuth, async (_request, response, next) => {
  try {
    const data = await listProjects()
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.get('/api/finance', requireAuth, async (request, response, next) => {
  try {
    const data = await listFinanceWorkspace({
      month: request.query.month,
    })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.get('/api/assistant/context', requireAuth, async (request, response, next) => {
  try {
    const data = await listAssistantContext({ auth: request.auth })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/assistant/analyze', requireAuth, async (request, response, next) => {
  const question = String(request.body?.question || '').trim()

  if (!question) {
    response.status(400).json({ message: 'A pergunta para o assistente e obrigatoria.' })
    return
  }

  try {
    const data = await askWorkspaceAssistant({ auth: request.auth, question })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/finance/imports', requireAuth, async (request, response, next) => {
  const filename = String(request.body?.filename || '').trim()
  const csvText = String(request.body?.csvText || '')
  const month = String(request.body?.month || '').trim()

  if (!filename || !csvText) {
    response.status(400).json({ message: 'Arquivo CSV invalido.' })
    return
  }

  try {
    const data = await importFinanceCsv({
      filename,
      csvText,
      month,
      auth: request.auth,
    })
    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/finance/command/preview', requireAuth, async (request, response, next) => {
  const command = String(request.body?.command || '').trim()
  const month = String(request.body?.month || '').trim()

  if (!command) {
    response.status(400).json({ message: 'O comando financeiro e obrigatorio.' })
    return
  }

  try {
    const data = await previewFinanceCommand({ command, month })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/finance/command/apply', requireAuth, async (request, response, next) => {
  if (!request.body?.preview || typeof request.body.preview !== 'object') {
    response.status(400).json({ message: 'O preview financeiro e obrigatorio.' })
    return
  }

  try {
    const data = await applyFinanceCommand({ preview: request.body.preview })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/finance/imports/:importId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeFinanceImport({
      importId: request.params.importId,
      month: request.query.month,
    })

    if (data === false) {
      response.status(404).json({ message: 'Importacao nao encontrada.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/projects', requireAuth, async (request, response, next) => {
  const name = String(request.body?.name || '').trim()

  if (!name) {
    response.status(400).json({ message: 'O nome do projeto e obrigatorio.' })
    return
  }

  try {
    const data = await addProject(name)

    if (data === false) {
      response.status(400).json({ message: 'O nome do projeto e obrigatorio.' })
      return
    }

    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/projects/:projectId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeProject(request.params.projectId)

    if (data === false) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/projects/:projectId/tasks', requireAuth, async (request, response, next) => {
  const text = String(request.body?.text || '').trim()

  if (!text) {
    response.status(400).json({ message: 'O texto da tarefa e obrigatorio.' })
    return
  }

  try {
    const data = await addProjectTask(request.params.projectId, text)

    if (!data) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
      return
    }

    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/projects/:projectId/tasks/:taskId', requireAuth, async (request, response, next) => {
  if (typeof request.body?.done !== 'boolean') {
    response.status(400).json({ message: 'O campo done deve ser booleano.' })
    return
  }

  try {
    const data = await updateProjectTaskState(
      request.params.projectId,
      request.params.taskId,
      request.body.done,
    )

    if (data === null) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
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

app.delete('/api/projects/:projectId/tasks/:taskId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeProjectTask(request.params.projectId, request.params.taskId)

    if (data === null) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
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

app.post('/api/projects/:projectId/notes', requireAuth, async (request, response, next) => {
  const text = String(request.body?.text || '').trim()

  if (!text) {
    response.status(400).json({ message: 'O texto da anotacao e obrigatorio.' })
    return
  }

  try {
    const data = await addProjectNote(request.params.projectId, text)

    if (!data) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
      return
    }

    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/ai/project-command/preview', requireAuth, async (request, response, next) => {
  const command = String(request.body?.command || '').trim()
  const currentProjectId = String(request.body?.currentProjectId || '').trim()

  if (!command) {
    response.status(400).json({ message: 'O comando para a IA e obrigatorio.' })
    return
  }

  try {
    const data = await generateProjectCommandPreview({ command, currentProjectId })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/ai/project-command/apply', requireAuth, async (request, response, next) => {
  if (!request.body?.preview || typeof request.body.preview !== 'object') {
    response.status(400).json({ message: 'O preview da IA e obrigatorio.' })
    return
  }

  try {
    const data = await applyProjectCommandPreview({ auth: request.auth, preview: request.body.preview })
    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/projects/:projectId/notes/:noteId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeProjectNote(request.params.projectId, request.params.noteId)

    if (data === null) {
      response.status(404).json({ message: 'Projeto nao encontrado.' })
      return
    }

    if (data === false) {
      response.status(404).json({ message: 'Anotacao nao encontrada.' })
      return
    }

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

const handleResponseNotifications = async (request, response, next) => {
  const expectedSecret = String(process.env.INTERNAL_CRON_SECRET || '').trim()
  const providedSecret = String(
    request.headers['x-cron-secret'] || request.query.secret || request.body?.secret || '',
  ).trim()

  if (!expectedSecret || providedSecret !== expectedSecret) {
    response.status(401).json({ message: 'Nao autorizado.' })
    return
  }

  try {
    const data = await processUnreadResponseNotifications({
      source: request.body?.source || request.query.source,
      search: request.body?.search || request.query.search,
      limit: request.body?.limit || request.query.limit || 200,
    })
    response.json({ ok: true, ...data })
  } catch (error) {
    next(error)
  }
}

app.get('/api/responses/notify', handleResponseNotifications)
app.post('/api/responses/notify', handleResponseNotifications)

app.post('/api/days', requireAuth, async (request, response, next) => {
  try {
    const data = await addDay(request.auth, request.body?.dateKey)

    if (data === false) {
      response.status(400).json({ message: 'Data invalida.' })
      return
    }

    response.status(data.created ? 201 : 200).json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/days/today', requireAuth, async (request, response, next) => {
  try {
    const data = await ensureTodayDay(request.auth)
    response.status(data.created ? 201 : 200).json(data)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/days/:dayId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeDay(request.auth, request.params.dayId)

    if (data === false) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    response.json(data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/days/:dayId/tasks', requireAuth, async (request, response, next) => {
  const text = String(request.body?.text || '').trim()

  if (!text) {
    response.status(400).json({ message: 'O texto da tarefa e obrigatorio.' })
    return
  }

  try {
    const data = await addTaskToDay(request.auth, request.params.dayId, text)

    if (!data) {
      response.status(404).json({ message: 'Dia nao encontrado.' })
      return
    }

    response.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/days/:dayId/tasks/:taskId', requireAuth, async (request, response, next) => {
  if (typeof request.body?.done !== 'boolean') {
    response.status(400).json({ message: 'O campo done deve ser booleano.' })
    return
  }

  try {
    const data = await updateTaskState(
      request.auth,
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

app.delete('/api/days/:dayId/tasks/:taskId', requireAuth, async (request, response, next) => {
  try {
    const data = await removeTaskFromDay(request.auth, request.params.dayId, request.params.taskId)

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
  response.status(error.statusCode || 500).json({ message: error.message || 'Erro interno do servidor.' })
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
