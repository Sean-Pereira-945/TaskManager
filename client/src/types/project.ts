export type ProjectRole = 'owner' | 'member'

export interface Project {
  id: string
  name: string
  description: string | null
  ownerId: string
  role: ProjectRole
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: ProjectRole
  joinedAt: string
}
