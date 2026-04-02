const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const AUTH_TOKEN_STORAGE_KEY = 'planner.authToken'

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

const writeStoredToken = (token) => {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    return
  }

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

const createRequestOptions = (options = {}) => {
  const token = readStoredToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return {
    credentials: 'include',
    ...options,
    headers,
  }
}

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao comunicar com a API.')
  }

  return payload
}

export const fetchDays = async () => {
  const response = await fetch(`${API_BASE_URL}/days`, createRequestOptions())
  return parseResponse(response)
}

export const createDay = async (dateKey) => {
  const response = await fetch(`${API_BASE_URL}/days`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dateKey }),
    }),
    method: 'POST',
  })

  return parseResponse(response)
}

export const openTodayDay = async () => {
  const response = await fetch(`${API_BASE_URL}/days/today`, {
    ...createRequestOptions({
      method: 'POST',
    }),
    method: 'POST',
  })

  return parseResponse(response)
}

export const deleteDay = async (dayId) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
    method: 'DELETE',
  })

  return parseResponse(response)
}

export const createTask = async (dayId, text) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }),
  })

  return parseResponse(response)
}

export const updateTask = async (dayId, taskId, done) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks/${taskId}`, {
    ...createRequestOptions({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ done }),
    }),
  })

  return parseResponse(response)
}

export const deleteTask = async (dayId, taskId) => {
  const response = await fetch(`${API_BASE_URL}/days/${dayId}/tasks/${taskId}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
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
  const response = await fetch(`${API_BASE_URL}/responses${query ? `?${query}` : ''}`, createRequestOptions())
  return parseResponse(response)
}

export const fetchProjects = async () => {
  const response = await fetch(`${API_BASE_URL}/projects`, createRequestOptions())
  return parseResponse(response)
}

export const fetchFinanceWorkspace = async ({ month } = {}) => {
  const params = new URLSearchParams()

  if (month) {
    params.set('month', month)
  }

  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/finance${query ? `?${query}` : ''}`, createRequestOptions())
  return parseResponse(response)
}

export const importFinanceCsv = async ({ filename, csvText, month }) => {
  const response = await fetch(`${API_BASE_URL}/finance/imports`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, csvText, month }),
    }),
  })

  return parseResponse(response)
}

export const deleteFinanceImport = async ({ importId, month }) => {
  const params = new URLSearchParams()

  if (month) {
    params.set('month', month)
  }

  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/finance/imports/${importId}${query ? `?${query}` : ''}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
  })

  return parseResponse(response)
}

export const previewFinanceCommand = async ({ command, month }) => {
  const response = await fetch(`${API_BASE_URL}/finance/command/preview`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, month }),
    }),
  })

  return parseResponse(response)
}

export const applyFinanceCommand = async (preview) => {
  const response = await fetch(`${API_BASE_URL}/finance/command/apply`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preview }),
    }),
  })

  return parseResponse(response)
}

export const createProject = async (name) => {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    }),
  })
  return parseResponse(response)
}

export const deleteProject = async (projectId) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
  })
  return parseResponse(response)
}

export const createProjectTask = async (projectId, text) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }),
  })
  return parseResponse(response)
}

export const updateProjectTask = async (projectId, taskId, done) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}`, {
    ...createRequestOptions({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ done }),
    }),
  })
  return parseResponse(response)
}

export const deleteProjectTask = async (projectId, taskId) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
  })
  return parseResponse(response)
}

export const createProjectNote = async (projectId, text) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }),
  })
  return parseResponse(response)
}

export const previewProjectAiCommand = async ({ command, currentProjectId }) => {
  const response = await fetch(`${API_BASE_URL}/ai/project-command/preview`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, currentProjectId }),
    }),
  })

  return parseResponse(response)
}

export const applyProjectAiCommand = async (preview) => {
  const response = await fetch(`${API_BASE_URL}/ai/project-command/apply`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preview }),
    }),
  })

  return parseResponse(response)
}

export const deleteProjectNote = async (projectId, noteId) => {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes/${noteId}`, {
    ...createRequestOptions({
      method: 'DELETE',
    }),
  })
  return parseResponse(response)
}

export const markResponsesRead = async ({ ids, read = true }) => {
  const response = await fetch(`${API_BASE_URL}/responses/read`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, read }),
    }),
  })

  return parseResponse(response)
}

export const fetchSession = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/session`, createRequestOptions())
  return parseResponse(response)
}

export const login = async ({ username, password }) => {
  const response = await fetch(`${API_BASE_URL}/mobile/auth/login`, {
    ...createRequestOptions({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    }),
    method: 'POST',
  })
  const payload = await parseResponse(response)
  writeStoredToken(payload.token || '')

  return {
    authenticated: Boolean(payload.authenticated),
    user: payload.user || null,
  }
}

export const logout = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    ...createRequestOptions({
      method: 'POST',
    }),
  })
  const payload = await parseResponse(response)
  writeStoredToken('')
  return payload
}
