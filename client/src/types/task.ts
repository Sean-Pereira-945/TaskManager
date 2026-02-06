export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskPayload {
  title: string
  description: string
  status: TaskStatus
  dueDate?: string | null
}

export type TaskSort = 'newest' | 'oldest' | 'title'

export interface TaskQueryState {
  status: TaskStatus | 'ALL'
  search: string
  sort: TaskSort
}

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
