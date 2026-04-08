import { listFinanceWorkspace } from './financeService.js'
import { listDays } from './plannerService.js'
import { listProjects } from './projectService.js'
import { listResponses } from './responseService.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'

const getGroqConfig = () => {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim()

  if (!apiKey) {
    const error = new Error('GROQ_API_KEY nao configurada.')
    error.statusCode = 503
    throw error
  }

  return {
    apiKey,
    model: String(process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim() || DEFAULT_GROQ_MODEL,
  }
}

const summarizePlanner = (days = []) => {
  const totalTasks = days.reduce((total, day) => total + day.tasks.length, 0)
  const completedTasks = days.reduce(
    (total, day) => total + day.tasks.filter((task) => task.done).length,
    0,
  )

  return {
    totalDays: days.length,
    totalTasks,
    completedTasks,
    pendingTasks: Math.max(totalTasks - completedTasks, 0),
    recentDays: days.slice(0, 5).map((day) => ({
      id: day.id,
      dateKey: day.dateKey,
      label: day.label,
      date: day.date,
      note: day.note,
      tasks: day.tasks.map((task) => ({
        text: task.text,
        done: task.done,
      })),
    })),
  }
}

const summarizeProjects = (projects = []) => ({
  totalProjects: projects.length,
  totalTasks: projects.reduce((total, project) => total + project.tasks.length, 0),
  completedTasks: projects.reduce(
    (total, project) => total + project.tasks.filter((task) => task.done).length,
    0,
  ),
  totalNotes: projects.reduce((total, project) => total + project.notes.length, 0),
  topProjects: projects.slice(0, 6).map((project) => ({
    id: project.id,
    slug: project.slug,
    name: project.name,
    pendingTasks: project.tasks.filter((task) => !task.done).length,
    completedTasks: project.tasks.filter((task) => task.done).length,
    notes: project.notes.slice(0, 4).map((note) => note.text),
    tasks: project.tasks.slice(0, 6).map((task) => ({
      text: task.text,
      done: task.done,
    })),
  })),
})

const summarizeResponses = (payload) => ({
  total: payload?.summary?.total || 0,
  unreadTotal: payload?.summary?.unreadTotal || 0,
  bySource: payload?.summary?.bySource || {},
  unreadBySource: payload?.summary?.unreadBySource || {},
  recent: (payload?.items || []).slice(0, 8).map((item) => ({
    id: item.id,
    source: item.source,
    name: item.name,
    company: item.company,
    message: item.message,
    isRead: item.isRead,
    createdAt: item.createdAt,
  })),
})

const summarizeFinanceWorkspace = (month, workspace) => ({
  month,
  summary: workspace.summary,
  imports: workspace.imports.map((item) => ({
    id: item.id,
    filename: item.filename,
    bank: item.bank,
    rowCount: item.rowCount,
    createdBy: item.createdBy,
    createdAtLabel: item.createdAtLabel,
  })),
  sampleTransactions: workspace.transactions.slice(-8).reverse().map((item) => ({
    id: item.id,
    date: item.date,
    description: item.description,
    bank: item.bank,
    category: item.category,
    amount: item.amount,
    ignored: item.ignored,
  })),
})

const buildAnalysisPrompt = ({ question, context }) =>
  [
    'Voce e um assistente analitico do workspace.',
    'Responda em portugues do Brasil.',
    'Use apenas os dados fornecidos abaixo.',
    'Nao invente fatos, nao assuma campos ausentes e deixe claro quando algo nao estiver no contexto.',
    'Priorize: responder a pergunta, destacar numeros chave, apontar riscos, pendencias e oportunidades.',
    'Se fizer sentido, feche com uma lista curta de proximos passos.',
    '',
    `Pergunta do usuario: ${question}`,
    '',
    'Contexto consolidado do workspace em JSON:',
    JSON.stringify(context, null, 2),
  ].join('\n')

export const listAssistantContext = async ({ auth }) => {
  const [plannerPayload, projectsPayload, responsesPayload, financeCurrentPayload] = await Promise.all([
    listDays(auth),
    listProjects(),
    listResponses({ limit: 80 }),
    listFinanceWorkspace({}),
  ])

  const financeMonths = (financeCurrentPayload.months || []).slice(0, 3)
  const financeMonthPayloads = await Promise.all(
    financeMonths.map(async (month) => ({
      month,
      workspace: await listFinanceWorkspace({ month }),
    })),
  )

  return {
    planner: summarizePlanner(plannerPayload.days || []),
    projects: summarizeProjects(projectsPayload.workspace?.projects || projectsPayload.projects || []),
    responses: summarizeResponses(responsesPayload),
    finance: {
      availableMonths: financeCurrentPayload.months || [],
      months: financeMonthPayloads.map(({ month, workspace }) => summarizeFinanceWorkspace(month, workspace)),
    },
  }
}

export const askWorkspaceAssistant = async ({ auth, question }) => {
  const normalizedQuestion = String(question || '').trim()

  if (!normalizedQuestion) {
    const error = new Error('A pergunta para o assistente e obrigatoria.')
    error.statusCode = 400
    throw error
  }

  const context = await listAssistantContext({ auth })
  const { apiKey, model } = getGroqConfig()

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Voce responde como um analista operacional e financeiro. Seja objetivo, concreto e legivel em markdown simples.',
        },
        {
          role: 'user',
          content: buildAnalysisPrompt({ question: normalizedQuestion, context }),
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Falha ao consultar o assistente.'
    const error = new Error(message)
    error.statusCode = response.status
    throw error
  }

  return {
    answer: String(payload?.choices?.[0]?.message?.content || '').trim(),
    provider: 'groq',
    model,
    context,
  }
}
