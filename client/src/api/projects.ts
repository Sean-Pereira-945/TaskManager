import { apiRequest } from '../lib/apiClient'
import type { Project, ProjectMember } from '../types/project'

export type CreateProjectPayload = {
  name: string
  description?: string | null
}

export const fetchProjects = () => {
  return apiRequest<Project[]>('/api/projects')
}

export const createProject = (payload: CreateProjectPayload) => {
  return apiRequest<Project>('/api/projects', {
    method: 'POST',
    body: payload,
  })
}

export const fetchProjectMembers = (projectId: string) => {
  return apiRequest<ProjectMember[]>(`/api/projects/${projectId}/members`)
}

export const addProjectMember = (projectId: string, email: string) => {
  return apiRequest<ProjectMember>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: { email },
  })
}

export const removeProjectMember = (projectId: string, memberId: string) => {
  return apiRequest<void>(`/api/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

export const deleteProject = (projectId: string) => {
  return apiRequest<void>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  })
}
