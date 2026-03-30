const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const withCredentials = {
  credentials: 'include',
}

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao comunicar com a API.')
  }

  return payload
}

export const fetchDays = async () => {
  const response = await fetch(`${API_BASE_URL}/days`, withCredentials)
  return parseResponse(response)
}

export const createDay = async (dateKey) => {
  const response = await fetch(`${API_BASE_URL}/days`, {
    ...withCredentials,
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
    ...withCredentials,
    method: 'POST',
  })

  return parseResponse(response)
}

export const deleteDay = async (dayId) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}`, {
    ...withCredentials,
    method: 'DELETE',
  })

  return parseResponse(response)
}

export const createTask = async (dayId, text) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks`, {
    ...withCredentials,
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
    ...withCredentials,
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
    ...withCredentials,
    method: 'DELETE',
  })

  return parseResponse(response)
}

export const fetchResponses = async ({ source = '', search = '', limit = 50 } = {}) => {
  const params = new URLSearchParams()

  if (source) {
    params.set('source', source)
  }

  if (search) {
    params.set('search', search)
  }

  if (limit) {
    params.set('limit', String(limit))
  }

  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/responses${query ? `?${query}` : ''}`, withCredentials)
  return parseResponse(response)
}

export const fetchProjects = async () => {
  const response = await fetch(`${API_BASE_URL}/projects`, withCredentials)
  return parseResponse(response)
}

export const markResponsesRead = async ({ ids, read = true }) => {
  const response = await fetch(`${API_BASE_URL}/responses/read`, {
    ...withCredentials,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids, read }),
  })

  return parseResponse(response)
}

export const fetchSession = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/session`, withCredentials)
  return parseResponse(response)
}

export const login = async ({ username, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    ...withCredentials,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  return parseResponse(response)
}

export const logout = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    ...withCredentials,
    method: 'POST',
  })
  return parseResponse(response)
}
