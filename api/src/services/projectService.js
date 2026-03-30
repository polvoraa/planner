import { randomUUID } from 'node:crypto'
import { ProjectWorkspace } from '../models/ProjectWorkspace.js'

const WORKSPACE_KEY = 'main'

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildTask = (text, done = false) => ({
  id: randomUUID(),
  text: String(text || '').trim(),
  done,
})

const buildNote = (text) => ({
  id: randomUUID(),
  text: String(text || '').trim(),
})

const buildProject = (name, options = {}) => ({
  id: options.id || randomUUID(),
  slug: options.slug || slugify(name),
  name: String(name || '').trim(),
  tasks: Array.isArray(options.tasks) ? options.tasks : [],
  notes: Array.isArray(options.notes) ? options.notes : [],
})

const defaultProjects = [
  buildProject('Nova Studio', {
    slug: 'nova-studio',
    tasks: [
      buildTask('Definir backlog da sprint do app.'),
      buildTask('Revisar identidade visual das entregas.'),
      buildTask('Consolidar prioridades com o time.'),
    ],
    notes: [
      buildNote('Centralizar aqui tarefas e anotacoes operacionais do projeto.'),
      buildNote('Usar essa aba como area privada, igual ao acesso das mensagens.'),
      buildNote('Adicionar mais projetos depois sem alterar o fluxo de autenticacao.'),
    ],
  }),
]

const normalizeTask = (task) => {
  if (typeof task === 'string') {
    return buildTask(task)
  }

  return {
    id: String(task?.id || randomUUID()),
    text: String(task?.text || '').trim(),
    done: Boolean(task?.done),
  }
}

const normalizeNote = (note) => {
  if (typeof note === 'string') {
    return buildNote(note)
  }

  return {
    id: String(note?.id || randomUUID()),
    text: String(note?.text || '').trim(),
  }
}

const normalizeProject = (project) => {
  const name = String(project?.name || '').trim()
  const slug = slugify(project?.slug || name)

  return {
    id: String(project?.id || randomUUID()),
    slug,
    name,
    tasks: (Array.isArray(project?.tasks) ? project.tasks : []).map(normalizeTask).filter((task) => task.text),
    notes: (Array.isArray(project?.notes) ? project.notes : []).map(normalizeNote).filter((note) => note.text),
  }
}

const formatWorkspace = (workspace) => ({
  projects: workspace.projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    name: project.name,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      text: task.text,
      done: task.done,
    })),
    notes: project.notes.map((note) => ({
      id: note.id,
      text: note.text,
    })),
  })),
})

const ensureUniqueSlug = (workspace, name, currentProjectId = '') => {
  const baseSlug = slugify(name) || 'projeto'
  let slug = baseSlug
  let suffix = 2

  while (workspace.projects.some((project) => project.slug === slug && project.id !== currentProjectId)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}

const findProject = (workspace, projectId) => workspace.projects.find((project) => project.id === projectId)

export const getOrCreateProjectWorkspace = async () => {
  let workspace = await ProjectWorkspace.findOne({ key: WORKSPACE_KEY })

  if (!workspace) {
    workspace = await ProjectWorkspace.create({
      key: WORKSPACE_KEY,
      projects: defaultProjects,
    })

    return workspace
  }

  const normalizedProjects = workspace.projects.map(normalizeProject).filter((project) => project.name)
  const changed = JSON.stringify(normalizedProjects) !== JSON.stringify(workspace.projects)

  if (changed) {
    workspace.projects = normalizedProjects
    await workspace.save()
  }

  return workspace
}

export const listProjects = async () => {
  const workspace = await getOrCreateProjectWorkspace()
  return formatWorkspace(workspace)
}

export const addProject = async (name) => {
  const projectName = String(name || '').trim()

  if (!projectName) {
    return false
  }

  const workspace = await getOrCreateProjectWorkspace()
  const slug = ensureUniqueSlug(workspace, projectName)
  const project = buildProject(projectName, { slug, tasks: [], notes: [] })

  workspace.projects.unshift(project)
  await workspace.save()

  return {
    workspace: formatWorkspace(workspace),
    projectId: project.id,
  }
}

export const removeProject = async (projectId) => {
  const workspace = await getOrCreateProjectWorkspace()
  const nextProjects = workspace.projects.filter((project) => project.id !== projectId)

  if (nextProjects.length === workspace.projects.length) {
    return false
  }

  workspace.projects = nextProjects
  await workspace.save()
  return formatWorkspace(workspace)
}

export const addProjectTask = async (projectId, text) => {
  const workspace = await getOrCreateProjectWorkspace()
  const project = findProject(workspace, projectId)

  if (!project) {
    return null
  }

  project.tasks.push(buildTask(text))
  await workspace.save()
  return formatWorkspace(workspace)
}

export const updateProjectTaskState = async (projectId, taskId, done) => {
  const workspace = await getOrCreateProjectWorkspace()
  const project = findProject(workspace, projectId)

  if (!project) {
    return null
  }

  const task = project.tasks.find((item) => item.id === taskId)

  if (!task) {
    return false
  }

  task.done = done
  await workspace.save()
  return formatWorkspace(workspace)
}

export const removeProjectTask = async (projectId, taskId) => {
  const workspace = await getOrCreateProjectWorkspace()
  const project = findProject(workspace, projectId)

  if (!project) {
    return null
  }

  const nextTasks = project.tasks.filter((task) => task.id !== taskId)

  if (nextTasks.length === project.tasks.length) {
    return false
  }

  project.tasks = nextTasks
  await workspace.save()
  return formatWorkspace(workspace)
}

export const addProjectNote = async (projectId, text) => {
  const workspace = await getOrCreateProjectWorkspace()
  const project = findProject(workspace, projectId)

  if (!project) {
    return null
  }

  project.notes.push(buildNote(text))
  await workspace.save()
  return formatWorkspace(workspace)
}

export const removeProjectNote = async (projectId, noteId) => {
  const workspace = await getOrCreateProjectWorkspace()
  const project = findProject(workspace, projectId)

  if (!project) {
    return null
  }

  const nextNotes = project.notes.filter((note) => note.id !== noteId)

  if (nextNotes.length === project.notes.length) {
    return false
  }

  project.notes = nextNotes
  await workspace.save()
  return formatWorkspace(workspace)
}
