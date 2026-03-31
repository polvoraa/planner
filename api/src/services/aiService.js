import { appendNoteToDay, ensureTodayDay } from './plannerService.js'
import {
  addProjectNote,
  addProjectTask,
  getOrCreateProjectWorkspace,
  listProjects,
} from './projectService.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const SUPPORTED_ACTION_TYPES = new Set([
  'project_task',
  'project_note',
  'daily_task',
  'personal_note',
])

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const slugify = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

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

const buildProjectCatalog = (workspace) =>
  workspace.projects.map((project) => ({
    id: project.id,
    name: project.name,
    slug: project.slug,
  }))

const resolveProject = (workspace, candidate, currentProjectId = '') => {
  const currentProject = workspace.projects.find((project) => project.id === currentProjectId) || null
  const normalizedCandidate = normalizeText(candidate)

  if (!normalizedCandidate || ['current', 'current project', 'projeto atual', 'atual'].includes(normalizedCandidate)) {
    return currentProject
  }

  const candidateSlug = slugify(candidate)

  return (
    workspace.projects.find((project) => project.id === candidate) ||
    workspace.projects.find((project) => normalizeText(project.name) === normalizedCandidate) ||
    workspace.projects.find((project) => project.slug === candidateSlug) ||
    workspace.projects.find((project) => normalizeText(project.name).includes(normalizedCandidate)) ||
    workspace.projects.find((project) => normalizedCandidate.includes(normalizeText(project.name))) ||
    null
  )
}

const parseJsonFromContent = (content) => {
  const rawContent = String(content || '').trim()

  if (!rawContent) {
    throw new Error('Resposta vazia da IA.')
  }

  try {
    return JSON.parse(rawContent)
  } catch {
    const fencedMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i)

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim())
    }

    const firstBrace = rawContent.indexOf('{')
    const lastBrace = rawContent.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(rawContent.slice(firstBrace, lastBrace + 1))
    }

    throw new Error('Nao foi possivel interpretar o JSON retornado pela IA.')
  }
}

const normalizeParsedActions = (parsed) => {
  const rawActions = Array.isArray(parsed?.actions)
    ? parsed.actions
    : Array.isArray(parsed?.items)
      ? parsed.items
      : []

  if (rawActions.length > 0) {
    return rawActions
      .map((action) => ({
        type: SUPPORTED_ACTION_TYPES.has(String(action?.type || '').trim())
          ? String(action.type).trim()
          : 'project_task',
        text: String(action?.text || action?.title || '').trim(),
      }))
      .filter((action) => action.text)
  }

  const fallbackTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []
  const fallbackNotes = Array.isArray(parsed?.notes) ? parsed.notes : []

  return [
    ...fallbackTasks.map((task) => ({
      type: 'project_task',
      text: String(task?.text || task || '').trim(),
    })),
    ...fallbackNotes.map((note) => ({
      type: 'project_note',
      text: String(note?.text || note || '').trim(),
    })),
  ].filter((action) => action.text)
}

const normalizePreview = ({ parsed, workspace, currentProjectId, command, model }) => {
  const warnings = []
  const resolvedProject = resolveProject(
    workspace,
    parsed?.project || parsed?.projectName || parsed?.targetProject,
    currentProjectId,
  )

  const actions = normalizeParsedActions(parsed).map((action) => {
    if (action.type === 'project_task' || action.type === 'project_note') {
      if (!resolvedProject) {
        warnings.push(`Sem projeto valido para "${action.text}".`)

        return {
          type: action.type,
          text: action.text,
          destination: 'skipped',
          reason: 'Projeto nao identificado.',
        }
      }

      return {
        type: action.type,
        text: action.text,
        destination: 'project',
        projectId: resolvedProject.id,
        projectName: resolvedProject.name,
      }
    }

    if (action.type === 'daily_task') {
      return {
        type: action.type,
        text: action.text,
        destination: 'daily',
        destinationLabel: 'Nota do dia de hoje',
      }
    }

    warnings.push(`Item pessoal redirecionado para a nota diaria: "${action.text}".`)

    return {
      type: action.type,
      text: action.text,
      destination: 'daily',
      destinationLabel: 'Nota do dia de hoje',
      reason: 'Item pessoal ou fora do contexto do projeto enviado para a nota diaria.',
    }
  })

  return {
    command: String(command || '').trim(),
    provider: 'groq',
    model,
    targetProject: resolvedProject
      ? {
          id: resolvedProject.id,
          name: resolvedProject.name,
          slug: resolvedProject.slug,
        }
      : null,
    actions,
    warnings: [...new Set(warnings)],
  }
}

const buildPrompt = ({ command, currentProject, projects }) => {
  const projectList = projects.map((project) => `- ${project.name} (${project.slug})`).join('\n')

  return [
    'Voce converte comandos soltos de produtividade em JSON estruturado.',
    'Responda apenas com JSON valido.',
    'Use este formato:',
    '{',
    '  "project": "nome do projeto ou vazio",',
    '  "actions": [',
    '    { "type": "project_task|project_note|daily_task|personal_note", "text": "texto objetivo" }',
    '  ]',
    '}',
    'Regras:',
    '- Nao invente projetos fora da lista.',
    '- Se o usuario nao citar projeto e houver projeto atual, use o projeto atual.',
    '- Tarefas de trabalho viram project_task.',
    '- Observacoes de contexto viram project_note.',
    '- Itens pessoais, romanticos ou sem relacao clara com o projeto viram personal_note.',
    '- Se algo for uma prioridade atual, lembrete de hoje ou item operacional imediato, use daily_task.',
    '- Transforme frases vagas em itens curtos e executaveis.',
    '',
    `Projeto atual: ${currentProject ? `${currentProject.name} (${currentProject.slug})` : 'nenhum'}`,
    'Projetos disponiveis:',
    projectList || '- nenhum',
    '',
    `Comando do usuario: ${command}`,
  ].join('\n')
}

const requestGroqPreview = async ({ command, currentProjectId = '' }) => {
  const workspace = await getOrCreateProjectWorkspace()
  const currentProject = workspace.projects.find((project) => project.id === currentProjectId) || null
  const projects = buildProjectCatalog(workspace)
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
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Voce retorna somente JSON valido, sem markdown e sem texto extra.',
        },
        {
          role: 'user',
          content: buildPrompt({ command, currentProject, projects }),
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'Falha ao consultar o Groq.'
    const error = new Error(message)
    error.statusCode = response.status
    throw error
  }

  const content = payload?.choices?.[0]?.message?.content || ''
  const parsed = parseJsonFromContent(content)

  return normalizePreview({
    parsed,
    workspace,
    currentProjectId,
    command,
    model,
  })
}

const sanitizePreviewForApply = async (previewInput) => {
  const workspace = await getOrCreateProjectWorkspace()
  const targetProject = resolveProject(
    workspace,
    previewInput?.targetProject?.id || previewInput?.targetProject?.name || '',
    '',
  )

  const actions = (Array.isArray(previewInput?.actions) ? previewInput.actions : [])
    .map((action) => ({
      type: SUPPORTED_ACTION_TYPES.has(String(action?.type || '').trim())
        ? String(action.type).trim()
        : '',
      text: String(action?.text || '').trim(),
      destination: String(action?.destination || '').trim(),
    }))
    .filter((action) => action.type && action.text)

  return {
    targetProject,
    actions,
  }
}

export const generateProjectCommandPreview = async ({ command, currentProjectId = '' }) => {
  const trimmedCommand = String(command || '').trim()

  if (!trimmedCommand) {
    const error = new Error('O comando para a IA e obrigatorio.')
    error.statusCode = 400
    throw error
  }

  return requestGroqPreview({ command: trimmedCommand, currentProjectId })
}

export const applyProjectCommandPreview = async ({ auth, preview }) => {
  const { targetProject, actions } = await sanitizePreviewForApply(preview)

  if (!actions.length) {
    const error = new Error('Nenhuma acao valida foi enviada para aplicar.')
    error.statusCode = 400
    throw error
  }

  let todayDayId = ''
  const created = {
    projectTasks: 0,
    projectNotes: 0,
    dailyNotes: 0,
  }
  const skipped = []

  for (const action of actions) {
    if (action.type === 'project_task') {
      if (!targetProject) {
        skipped.push({ ...action, reason: 'Projeto nao identificado para aplicar.' })
        continue
      }

      await addProjectTask(targetProject.id, action.text)
      created.projectTasks += 1
      continue
    }

    if (action.type === 'project_note') {
      if (!targetProject) {
        skipped.push({ ...action, reason: 'Projeto nao identificado para aplicar.' })
        continue
      }

      await addProjectNote(targetProject.id, action.text)
      created.projectNotes += 1
      continue
    }

    if (action.type === 'daily_task') {
      if (!todayDayId) {
        const todayPayload = await ensureTodayDay(auth)
        todayDayId = todayPayload.dayId
      }

      await appendNoteToDay(auth, todayDayId, action.text)
      created.dailyNotes += 1
      continue
    }

    if (action.type === 'personal_note') {
      if (!todayDayId) {
        const todayPayload = await ensureTodayDay(auth)
        todayDayId = todayPayload.dayId
      }

      await appendNoteToDay(auth, todayDayId, action.text)
      created.dailyNotes += 1
      continue
    }

    skipped.push({ ...action, reason: 'Tipo de acao nao suportado para aplicacao.' })
  }

  const refreshedWorkspace = await listProjects()

  return {
    workspace: refreshedWorkspace.workspace || refreshedWorkspace,
    applied: {
      targetProject: targetProject
        ? {
            id: targetProject.id,
            name: targetProject.name,
            slug: targetProject.slug,
          }
        : null,
      created,
      skipped,
    },
  }
}
