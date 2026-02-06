import type { RequestHandler } from 'express'

import { db } from '../lib/db'
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
  created_at: Date
  updated_at: Date
}

const mapTask = (row: TaskRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  dueDate: row.due_date ? row.due_date.toISOString() : null,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
})

const buildOrderBy = (sort: string | undefined): string => {
  switch (sort) {
    case 'oldest':
      return 'created_at ASC'
    case 'title':
      return 'title ASC'
    default:
      return 'created_at DESC'
  }
}

export const listTasks: RequestHandler = asyncHandler(async (req, res) => {
  const query = listTasksQuerySchema.parse(req.query)
  const userId = req.user?.id

  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const clauses: string[] = ['user_id = $1']
  const values: unknown[] = [userId]

  if (query.status) {
    values.push(query.status)
    clauses.push(`status = $${values.length}`)
  }

  if (query.search && query.search.trim().length > 0) {
    const pattern = `%${query.search.trim()}%`
    values.push(pattern)
    const titleIndex = values.length
    values.push(pattern)
    const descriptionIndex = values.length
    clauses.push(`(title ILIKE $${titleIndex} OR description ILIKE $${descriptionIndex})`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const orderBy = buildOrderBy(query.sort)

  const { rows } = await db.query<TaskRow>(
    `SELECT id, title, description, status, user_id, due_date, created_at, updated_at
     FROM tasks
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

  const { rows } = await db.query<TaskRow>(
    `INSERT INTO tasks (title, description, status, user_id, due_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, status, user_id, due_date, created_at, updated_at`,
    [
      payload.title,
      payload.description,
      payload.status ?? 'TODO',
      userId,
      payload.dueDate ? new Date(payload.dueDate) : null,
    ],
  )

  res.status(201).json({ data: mapTask(rows[0]) })
})

export const updateTask: RequestHandler = asyncHandler(async (req, res) => {
  const params = taskIdParamSchema.parse(req.params)
  const payload = updateTaskSchema.parse(req.body)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const fields: string[] = []
  const values: unknown[] = []

  if (payload.title !== undefined) {
    values.push(payload.title)
    fields.push(`title = $${values.length}`)
  }
  if (payload.description !== undefined) {
    values.push(payload.description)
    fields.push(`description = $${values.length}`)
  }
  if (payload.status !== undefined) {
    values.push(payload.status)
    fields.push(`status = $${values.length}`)
  }
  if (payload.dueDate !== undefined) {
    values.push(payload.dueDate ? new Date(payload.dueDate) : null)
    fields.push(`due_date = $${values.length}`)
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'Provide at least one field to update')
  }

  const setClause = [...fields, 'updated_at = NOW()'].join(', ')

  values.push(params.id)
  const idIndex = values.length
  values.push(userId)
  const userIndex = values.length

  const { rows } = await db.query<TaskRow>(
    `UPDATE tasks
     SET ${setClause}
     WHERE id = $${idIndex} AND user_id = $${userIndex}
     RETURNING id, title, description, status, user_id, due_date, created_at, updated_at`,
    values,
  )

  if (!rows.length) {
    throw new HttpError(404, 'Task not found')
  }

  res.json({ data: mapTask(rows[0]) })
})

export const deleteTask: RequestHandler = asyncHandler(async (req, res) => {
  const params = taskIdParamSchema.parse(req.params)
  const userId = req.user?.id
  if (!userId) {
    throw new HttpError(401, 'Authentication required')
  }

  const result = await db.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [params.id, userId])

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Task not found')
  }

  res.status(204).send()
})

const findTaskById = async (id: string, userId: string) => {
  const { rows } = await db.query<TaskRow>(
    `SELECT id, title, description, status, user_id, due_date, created_at, updated_at
     FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )

  return rows[0] ?? null
}
