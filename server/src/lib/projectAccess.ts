import { db } from './db'
import { HttpError } from '../utils/httpError'

export type ProjectRole = 'owner' | 'member'

export type ProjectMembership = {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
}

const normalizeRole = (role: string | null): ProjectRole => (role === 'owner' ? 'owner' : 'member')

export const ensureProjectExists = async (projectId: string) => {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [projectId],
  )

  if (!rows.length) {
    throw new HttpError(404, 'Project not found')
  }
}

export const findProjectMembership = async (projectId: string, userId: string): Promise<ProjectMembership | null> => {
  const { rows } = await db.query<{ id: string; project_id: string; user_id: string; role: string | null }>(
    `SELECT id, project_id, user_id, role
     FROM project_members
     WHERE project_id = $1 AND user_id = $2
     LIMIT 1`,
    [projectId, userId],
  )

  if (!rows.length) {
    return null
  }

  const row = rows[0]
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: normalizeRole(row.role),
  }
}

export const requireProjectMember = async (projectId: string, userId: string) => {
  await ensureProjectExists(projectId)
  const membership = await findProjectMembership(projectId, userId)
  if (!membership) {
    throw new HttpError(403, 'You do not have access to this project')
  }
  return membership
}

export const requireProjectOwner = async (projectId: string, userId: string) => {
  const membership = await requireProjectMember(projectId, userId)
  if (membership.role !== 'owner') {
    throw new HttpError(403, 'Only the project owner can perform this action')
  }
  return membership
}

const createPersonalProject = async (userId: string) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const projectResult = await client.query<{ id: string }>(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Personal Workspace', 'Auto-created to organize your tasks', userId],
    )
    const projectId = projectResult.rows[0].id
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, userId],
    )
    await client.query('COMMIT')
    return projectId
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const ensureProjectBaselineForUser = async (userId: string) => {
  const { rows } = await db.query<{ project_id: string }>(
    `SELECT project_id
     FROM project_members
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId],
  )

  const anchorProjectId = rows[0]?.project_id ?? (await createPersonalProject(userId))

  await db.query(
    `UPDATE tasks
     SET project_id = $1
     WHERE user_id = $2 AND project_id IS NULL`,
    [anchorProjectId, userId],
  )

  return anchorProjectId
}
