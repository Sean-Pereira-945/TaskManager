import { z } from 'zod'

export const TASK_STATUS_VALUES = ['TODO', 'IN_PROGRESS', 'DONE'] as const
const statusEnum = z.enum(TASK_STATUS_VALUES)

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Invalid task id'),
})

const baseTaskSchema = z.object({
  title: z.string().min(3, 'Title should be at least 3 characters').max(120),
  description: z
    .string()
    .min(1, 'Description cannot be empty')
    .max(2000, 'Description is too long'),
  status: statusEnum.default('TODO'),
  dueDate: z
    .union([
      z.string().datetime({ offset: true, message: 'Provide a valid due date' }),
      z.null(),
    ])
    .optional(),
})

export const createTaskSchema = baseTaskSchema.partial({ status: true })

export const updateTaskSchema = baseTaskSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  {
    message: 'Provide at least one field to update',
  },
)

export const listTasksQuerySchema = z.object({
  status: statusEnum.optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'title']).optional().default('newest'),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type ListTaskQuery = z.infer<typeof listTasksQuerySchema>
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number]
