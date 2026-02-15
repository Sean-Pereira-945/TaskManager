import type { RequestHandler } from 'express'

import { db } from '../lib/db'
import { ensureProjectBaselineForUser, requireProjectMember, requireProjectOwner, type ProjectRole } from '../lib/projectAccess'
import { asyncHandler } from '../utils/asyncHandler'
import { HttpError } from '../utils/httpError'
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectIdParamSchema,
  projectMemberIdParamSchema,
} from './project.schemas'

interface ProjectRow {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: Date
  updated_at: Date
  role: string
}

interface ProjectMemberRow {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  created_at: Date
}

const normalizeRole = (value: string): ProjectRole => (value === 'owner' ? 'owner' : 'member')

const mapProject = (row: ProjectRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  ownerId: row.owner_id,
  role: normalizeRole(row.role),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
})

const mapMember = (row: ProjectMemberRow) => ({
  id: row.id,
  userId: row.user_id,
  email: row.email,
  name: row.name,
  role: normalizeRole(row.role),
  joinedAt: row.created_at.toISOString(),
})

const findUserByEmail = async (email: string) => {
  const { rows } = await db.query<{ id: string; email: string; name: string | null }>(
    `SELECT id, email, name
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email],
  )
  return rows[0] ?? null
}

export const listProjects: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await ensureProjectBaselineForUser(userId)

  const { rows } = await db.query<ProjectRow>(
    `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, p.updated_at, pm.role
     FROM project_members pm
     INNER JOIN projects p ON p.id = pm.project_id
     WHERE pm.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId],
  )

  res.json({ data: rows.map(mapProject) })
})

export const createProject: RequestHandler = asyncHandler(async (req, res) => {
  const payload = createProjectSchema.parse(req.body)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const client = await db.connect()

  try {
    await client.query('BEGIN')
    const projectResult = await client.query<ProjectRow>(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, owner_id, created_at, updated_at, 'owner'::text AS role`,
      [payload.name.trim(), payload.description?.trim() ?? null, userId],
    )
    const projectRow = projectResult.rows[0]
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectRow.id, userId],
    )
    await client.query('COMMIT')

    res.status(201).json({ data: mapProject(projectRow) })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

export const listProjectMembers: RequestHandler = asyncHandler(async (req, res) => {
  const params = projectIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await requireProjectMember(params.projectId, userId)

  const { rows } = await db.query<ProjectMemberRow>(
    `SELECT pm.id, pm.user_id, u.email, u.name, pm.role, pm.created_at
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.created_at ASC`,
    [params.projectId],
  )

  res.json({ data: rows.map(mapMember) })
})

export const addProjectMember: RequestHandler = asyncHandler(async (req, res) => {
  const params = projectIdParamSchema.parse(req.params)
  const payload = addProjectMemberSchema.parse(req.body)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await requireProjectOwner(params.projectId, userId)

  const targetUser = await findUserByEmail(payload.email)
  if (!targetUser) {
    throw new HttpError(404, 'No user with that email exists yet')
  }

  if (targetUser.id === userId) {
    throw new HttpError(400, 'You are already part of this project')
  }

  const insertResult = await db.query<ProjectMemberRow>(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (project_id, user_id) DO NOTHING
     RETURNING id, user_id, $2::text AS email, NULL::text AS name, 'member'::text AS role, created_at`,
    [params.projectId, targetUser.id],
  )

  if (!insertResult.rowCount) {
    throw new HttpError(409, 'That teammate is already part of the project')
  }

  const memberRow = insertResult.rows[0]
  const hydratedRow: ProjectMemberRow = {
    ...memberRow,
    email: targetUser.email,
    name: targetUser.name,
  }

  res.status(201).json({ data: mapMember(hydratedRow) })
})

export const removeProjectMember: RequestHandler = asyncHandler(async (req, res) => {
  const params = projectMemberIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const membership = await requireProjectOwner(params.projectId, userId)
  if (params.memberId === membership.userId) {
    throw new HttpError(400, 'Owners cannot remove themselves')
  }

  const { rows } = await db.query<{ role: string }>(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
    [params.projectId, params.memberId],
  )

  if (!rows.length) {
    throw new HttpError(404, 'Member not found in this project')
  }

  const activeAssignments = await db.query<{ count: string }>(
    `SELECT COUNT(1) FROM tasks WHERE project_id = $1 AND assignee_id = $2 AND status != 'DONE'`,
    [params.projectId, params.memberId],
  )

  if (Number(activeAssignments.rows[0].count) > 0) {
    throw new HttpError(409, 'Reassign this member’s open tasks before removing them')
  }

  await db.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [params.projectId, params.memberId])

  res.status(204).send()
})

export const deleteProject: RequestHandler = asyncHandler(async (req, res) => {
  const params = projectIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await requireProjectOwner(params.projectId, userId)

  await db.query('DELETE FROM projects WHERE id = $1', [params.projectId])

  res.status(204).send()
})
