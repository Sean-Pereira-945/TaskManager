export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface TaskProjectInfo {
  id: string
  name: string
}

export interface TaskAssignee {
  id: string
  name: string | null
  email: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  dueDate: string | null
  project: TaskProjectInfo
  assignee: TaskAssignee | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface TaskPayload {
  title: string
  description: string
  status: TaskStatus
  projectId: string
  assigneeId?: string | null
  dueDate?: string | null
}

export type TaskSort = 'newest' | 'oldest' | 'title'

export interface TaskQueryState {
  status: TaskStatus | 'ALL'
  search: string
  sort: TaskSort
  projectId: string | null
}

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
