const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao comunicar com a API.')
  }

  return payload
}

export const fetchDays = async () => {
  const response = await fetch(`${API_BASE_URL}/days`)
  return parseResponse(response)
}

export const createDay = async (dateKey) => {
  const response = await fetch(`${API_BASE_URL}/days`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dateKey }),
  })

  return parseResponse(response)
}

export const openTodayDay = async () => {
  const response = await fetch(`${API_BASE_URL}/days/today`, {
    method: 'POST',
  })

  return parseResponse(response)
}

export const deleteDay = async (dayId) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}`, {
    method: 'DELETE',
  })

  return parseResponse(response)
}

export const createTask = async (dayId, text) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  return parseResponse(response)
}

export const updateTask = async (dayId, taskId, done) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ done }),
  })

  return parseResponse(response)
}

export const deleteTask = async (dayId, taskId) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks/${taskId}`, {
    method: 'DELETE',
  })

  return parseResponse(response)
}
