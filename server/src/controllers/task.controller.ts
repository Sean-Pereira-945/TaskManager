import type { RequestHandler } from 'express'

import { db } from '../lib/db'
import { ensureProjectBaselineForUser, findProjectMembership, requireProjectMember } from '../lib/projectAccess'
import { asyncHandler } from '../utils/asyncHandler'
import { HttpError } from '../utils/httpError'
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
  type TaskStatusValue,
} from './task.schemas'

type TaskRow = {
  id: string
  title: string
  description: string
  status: TaskStatusValue
  user_id: string
  due_date: Date | null
  project_id: string
  project_name: string
  assignee_id: string | null
  assignee_name: string | null
  assignee_email: string | null
  created_at: Date
  updated_at: Date
  completed_at: Date | null
}

const TASK_SELECT = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.user_id,
    t.due_date,
    t.project_id,
    p.name AS project_name,
    t.assignee_id,
    assignee.name AS assignee_name,
    assignee.email AS assignee_email,
    t.created_at,
    t.updated_at,
    t.completed_at
  FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  LEFT JOIN users assignee ON assignee.id = t.assignee_id
`

const mapTask = (row: TaskRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  dueDate: row.due_date ? row.due_date.toISOString() : null,
  project: {
    id: row.project_id,
    name: row.project_name,
  },
  assignee: row.assignee_id
    ? {
        id: row.assignee_id,
        name: row.assignee_name,
        email: row.assignee_email,
      }
    : null,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  completedAt: row.completed_at ? row.completed_at.toISOString() : null,
})

const buildOrderBy = (sort: string | undefined): string => {
  switch (sort) {
    case 'oldest':
      return 't.created_at ASC'
    case 'title':
      return 't.title ASC'
    default:
      return 't.created_at DESC'
  }
}

const ensureAssigneeBelongs = async (projectId: string, assigneeId?: string | null) => {
  if (!assigneeId) {
    return
  }

  const membership = await findProjectMembership(projectId, assigneeId)
  if (!membership) {
    throw new HttpError(400, 'Assignee must already belong to this project')
  }
}

export const listTasks: RequestHandler = asyncHandler(async (req, res) => {
  const query = listTasksQuerySchema.parse(req.query)
  const userId = req.user?.id

  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await ensureProjectBaselineForUser(userId)

  if (query.projectId) {
    await requireProjectMember(query.projectId, userId)
  }

  const clauses: string[] = [
    `(
      t.user_id = $1 OR
      t.assignee_id = $1 OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = t.project_id AND pm.user_id = $1
      )
    )`,
  ]
  const values: unknown[] = [userId]

  if (query.status) {
    values.push(query.status)
    clauses.push(`t.status = $${values.length}`)
  }

  if (query.search && query.search.trim().length > 0) {
    const pattern = `%${query.search.trim()}%`
    values.push(pattern)
    const titleIndex = values.length
    values.push(pattern)
    const descriptionIndex = values.length
    clauses.push(`(t.title ILIKE $${titleIndex} OR t.description ILIKE $${descriptionIndex})`)
  }

  if (query.projectId) {
    values.push(query.projectId)
    clauses.push(`t.project_id = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = buildOrderBy(query.sort)

  const { rows } = await db.query<TaskRow>(
    `${TASK_SELECT}
     ${where}
     ORDER BY ${orderBy}`,
    values,
  )

  res.json({ data: rows.map(mapTask) })
})

export const getTask: RequestHandler = asyncHandler(async (req, res) => {
  const params = taskIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const task = await findTaskById(params.id, userId)
  if (!task) {
    throw new HttpError(404, 'Task not found')
  }

  res.json({ data: mapTask(task) })
})

export const createTask: RequestHandler = asyncHandler(async (req, res) => {
  const payload = createTaskSchema.parse(req.body)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  await requireProjectMember(payload.projectId, userId)
  await ensureAssigneeBelongs(payload.projectId, payload.assigneeId ?? null)

  const normalizedStatus = payload.status ?? 'TODO'
  const completedAt = normalizedStatus === 'DONE' ? new Date() : null

  const insertResult = await db.query<{ id: string }>(
    `INSERT INTO tasks (title, description, status, user_id, due_date, project_id, assignee_id, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      payload.title,
      payload.description,
      normalizedStatus,
      userId,
      payload.dueDate ? new Date(payload.dueDate) : null,
      payload.projectId,
      payload.assigneeId ?? null,
      completedAt,
    ],
  )

  const createdTask = await findTaskById(insertResult.rows[0].id, userId)
  if (!createdTask) {
    throw new HttpError(500, 'Unable to load new task')
  }

  res.status(201).json({ data: mapTask(createdTask) })
})

export const updateTask: RequestHandler = asyncHandler(async (req, res) => {
  const params = taskIdParamSchema.parse(req.params)
  const payload = updateTaskSchema.parse(req.body)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const currentTask = await findTaskById(params.id, userId)
  if (!currentTask) {
    throw new HttpError(404, 'Task not found')
  }

  const membership = await findProjectMembership(currentTask.project_id, userId)
  if (!membership) {
    throw new HttpError(403, 'You do not have access to update this project task')
  }

  const fields: string[] = []
  const values: unknown[] = []
  let shouldResetReminder = false

  if (payload.title !== undefined) {
    values.push(payload.title)
    fields.push(`title = $${values.length}`)
  }
  if (payload.description !== undefined) {
    values.push(payload.description)
    fields.push(`description = $${values.length}`)
  }
  if (payload.status !== undefined) {
    const nextStatus = payload.status
    const isCompleting = nextStatus === 'DONE' && currentTask.status !== 'DONE'
    if (isCompleting && membership.role !== 'owner') {
      throw new HttpError(403, 'Only project owners can mark tasks as done')
    }

    values.push(nextStatus)
    fields.push(`status = $${values.length}`)

    if (isCompleting) {
      fields.push('completed_at = NOW()')
    } else if (currentTask.status === 'DONE' && nextStatus !== 'DONE') {
      fields.push('completed_at = NULL')
    }
  }
  if (payload.dueDate !== undefined) {
    values.push(payload.dueDate ? new Date(payload.dueDate) : null)
    fields.push(`due_date = $${values.length}`)
    shouldResetReminder = true
  }

  if (payload.projectId !== undefined && payload.projectId !== currentTask.project_id) {
    throw new HttpError(400, 'Moving tasks between projects is not supported yet')
  }

  if (payload.assigneeId !== undefined) {
    await ensureAssigneeBelongs(currentTask.project_id, payload.assigneeId)
    values.push(payload.assigneeId ?? null)
    fields.push(`assignee_id = $${values.length}`)
    shouldResetReminder = true
  }

  if (shouldResetReminder) {
    fields.push('reminder_sent_at = NULL')
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'Provide at least one field to update')
  }

  const setClause = [...fields, 'updated_at = NOW()'].join(', ')

  values.push(params.id)
  const idIndex = values.length

  const { rowCount } = await db.query(
    `UPDATE tasks
     SET ${setClause}
     WHERE id = $${idIndex}`,
    values,
  )

  if (!rowCount) {
    throw new HttpError(404, 'Task not found')
  }

  const updatedTask = await findTaskById(params.id, userId)
  if (!updatedTask) {
    throw new HttpError(404, 'Task not found')
  }

  res.json({ data: mapTask(updatedTask) })
})

export const deleteTask: RequestHandler = asyncHandler(async (req, res) => {
  const params = taskIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const existingTask = await findTaskById(params.id, userId)
  if (!existingTask) {
    throw new HttpError(404, 'Task not found')
  }

  await db.query('DELETE FROM tasks WHERE id = $1', [params.id])

  res.status(204).send()
})

const findTaskById = async (id: string, userId: string) => {
  const { rows } = await db.query<TaskRow>(
    `${TASK_SELECT}
     WHERE t.id = $1
       AND (
         t.user_id = $2 OR
         t.assignee_id = $2 OR
         EXISTS (
           SELECT 1 FROM project_members pm
           WHERE pm.project_id = t.project_id AND pm.user_id = $2
         )
       )
     LIMIT 1`,
    [id, userId],
  )

  return rows[0] ?? null
}
