import { apiRequest } from '../lib/apiClient'
import type { Task, TaskPayload, TaskQueryState } from '../types/task'

const API_PREFIX = '/api/tasks'

const buildQueryString = (query: TaskQueryState) => {
  const params = new URLSearchParams()
  if (query.status && query.status !== 'ALL') {
    params.set('status', query.status)
  }
  if (query.search.trim()) {
    params.set('search', query.search.trim())
  }
  params.set('sort', query.sort)
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export const fetchTasks = async (query: TaskQueryState): Promise<Task[]> => {
  const queryString = buildQueryString(query)
  return apiRequest<Task[]>(`${API_PREFIX}${queryString}`)
}

export const createTask = async (payload: TaskPayload): Promise<Task> => {
  return apiRequest<Task>(API_PREFIX, {
    method: 'POST',
    body: payload,
  })
}

export const updateTask = async (id: string, payload: Partial<TaskPayload>): Promise<Task> => {
  return apiRequest<Task>(`${API_PREFIX}/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export const deleteTask = async (id: string): Promise<void> => {
  await apiRequest<void>(`${API_PREFIX}/${id}`, {
    method: 'DELETE',
  })
}
