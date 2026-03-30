import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://planner-jz7g.onrender.com/api';
const AUTH_TOKEN_KEY = 'planner.mobile.authToken';

let memoryToken = '';

const parseResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao comunicar com a API.');
  }

  return payload;
};

const withAuthHeaders = async () => {
  if (!memoryToken) {
    memoryToken = (await SecureStore.getItemAsync(AUTH_TOKEN_KEY)) || '';
  }

  return memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {};
};

const request = async (path: string, init: RequestInit = {}, authenticated = false) => {
  const headers = new Headers(init.headers);

  if (authenticated) {
    const authHeaders = await withAuthHeaders();

    if (authHeaders.Authorization) {
      headers.set('Authorization', authHeaders.Authorization);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  return parseResponse(response);
};

export const fetchDays = async () => request('/days');
export const createDay = async (dateKey: string) =>
  request('/days', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateKey }),
  });
export const openTodayDay = async () => request('/days/today', { method: 'POST' });
export const deleteDay = async (dayId: string) => request(`/days/${dayId}`, { method: 'DELETE' });
export const createTask = async (dayId: string, text: string) =>
  request(`/days/${dayId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
export const updateTask = async (dayId: string, taskId: string, done: boolean) =>
  request(`/days/${dayId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
export const deleteTask = async (dayId: string, taskId: string) =>
  request(`/days/${dayId}/tasks/${taskId}`, { method: 'DELETE' });

export const mobileLogin = async (username: string, password: string) => {
  const payload = await request('/mobile/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (payload?.token) {
    memoryToken = payload.token;
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, payload.token);
  }

  return payload;
};

export const fetchSession = async () => request('/auth/session', {}, true);
export const logout = async () => {
  try {
    await request('/auth/logout', { method: 'POST' }, true);
  } finally {
    memoryToken = '';
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
};
export const fetchResponses = async ({
  source = '',
  search = '',
  limit = 50,
}: {
  source?: string;
  search?: string;
  limit?: number;
} = {}) => {
  const params = new URLSearchParams();
  if (source) params.set('source', source);
  if (search) params.set('search', search);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return request(`/responses${query ? `?${query}` : ''}`, {}, true);
};
export const fetchProjects = async () => request('/projects', {}, true);
export const createProject = async (name: string) =>
  request(
    '/projects',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    true,
  );
export const deleteProject = async (projectId: string) =>
  request(`/projects/${projectId}`, { method: 'DELETE' }, true);
export const createProjectTask = async (projectId: string, text: string) =>
  request(
    `/projects/${projectId}/tasks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    true,
  );
export const updateProjectTask = async (projectId: string, taskId: string, done: boolean) =>
  request(
    `/projects/${projectId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    },
    true,
  );
export const deleteProjectTask = async (projectId: string, taskId: string) =>
  request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }, true);
export const createProjectNote = async (projectId: string, text: string) =>
  request(
    `/projects/${projectId}/notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    true,
  );
export const deleteProjectNote = async (projectId: string, noteId: string) =>
  request(`/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' }, true);
export const markResponsesRead = async (ids: string[], read = true) =>
  request(
    '/responses/read',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, read }),
    },
    true,
  );

export const restoreStoredToken = async () => {
  memoryToken = (await SecureStore.getItemAsync(AUTH_TOKEN_KEY)) || '';
  return memoryToken;
};
