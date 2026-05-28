export const sortOpenTasksFirst = (tasks = []) =>
  [...tasks].sort((leftTask, rightTask) => Number(leftTask.done) - Number(rightTask.done))

export const reorderTasks = (tasks = [], draggedTaskId, targetTaskId) => {
  const nextTasks = [...tasks]
  const draggedIndex = nextTasks.findIndex((task) => task.id === draggedTaskId)
  const targetIndex = nextTasks.findIndex((task) => task.id === targetTaskId)

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return nextTasks
  }

  const [draggedTask] = nextTasks.splice(draggedIndex, 1)
  nextTasks.splice(targetIndex, 0, draggedTask)

  return nextTasks
}
