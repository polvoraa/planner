export const defaultDays = [
  {
    id: 'today',
    label: 'Hoje',
    date: '26 Mar',
    note: 'Fechar prioridades do dia e remover bloqueios antes do fim da tarde.',
    tasks: [
      { id: '1', text: 'Atualizar status do projeto Atlas', done: true },
      { id: '2', text: 'Revisar tarefas da sprint com o time', done: false },
      { id: '3', text: 'Enviar notas da daily para stakeholders', done: false },
    ],
  },
  {
    id: 'tomorrow',
    label: 'Amanha',
    date: '27 Mar',
    note: 'Preparar backlog da semana e consolidar entregas do squad.',
    tasks: [
      { id: '4', text: 'Planejar kickoff da sprint 13', done: false },
      { id: '5', text: 'Organizar pendencias de QA', done: false },
    ],
  },
  {
    id: 'monday',
    label: 'Segunda',
    date: '30 Mar',
    note: 'Abrir a semana com foco em prioridades de execucao e alinhamento.',
    tasks: [{ id: '6', text: 'Definir objetivo semanal do produto', done: false }],
  },
  {
    id: 'tuesday',
    label: 'Terca',
    date: '31 Mar',
    note: 'Dia ideal para revisoes, dependencias e checkpoints tecnicos.',
    tasks: [{ id: '7', text: 'Revisar escopo com engenharia', done: false }],
  },
]
