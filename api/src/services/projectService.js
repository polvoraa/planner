import { ProjectWorkspace } from '../models/ProjectWorkspace.js'

const WORKSPACE_KEY = 'main'

const defaultProjects = [
  {
    slug: 'nova-studio',
    name: 'Nova Studio',
    tasks: [
      'Definir backlog da sprint do app.',
      'Revisar identidade visual das entregas.',
      'Consolidar prioridades com o time.',
    ],
    notes: [
      'Centralizar aqui tarefas e anotacoes operacionais do projeto.',
      'Usar essa aba como area privada, igual ao acesso das mensagens.',
      'Adicionar mais projetos depois sem alterar o fluxo de autenticacao.',
    ],
  },
]

const formatWorkspace = (workspace) => ({
  projects: workspace.projects.map((project) => ({
    slug: project.slug,
    name: project.name,
    tasks: [...project.tasks],
    notes: [...project.notes],
  })),
})

export const getOrCreateProjectWorkspace = async () => {
  let workspace = await ProjectWorkspace.findOne({ key: WORKSPACE_KEY })

  if (!workspace) {
    workspace = await ProjectWorkspace.create({
      key: WORKSPACE_KEY,
      projects: defaultProjects,
    })
  }

  return workspace
}

export const listProjects = async () => {
  const workspace = await getOrCreateProjectWorkspace()
  return formatWorkspace(workspace)
}
