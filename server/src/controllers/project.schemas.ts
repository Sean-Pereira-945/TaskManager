import { z } from 'zod'

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project id'),
})

export const projectMemberIdParamSchema = projectIdParamSchema.extend({
  memberId: z.string().uuid('Invalid member id'),
})

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name should be at least 3 characters')
    .max(120, 'Project name should be concise'),
  description: z
    .string()
    .max(500, 'Description should stay under 500 characters')
    .optional()
    .nullable(),
})

export const addProjectMemberSchema = z.object({
  email: z.string().email('Provide a valid teammate email').transform((value) => value.toLowerCase()),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>
