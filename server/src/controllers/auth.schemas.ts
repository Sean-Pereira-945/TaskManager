import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Provide a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name should be at least 2 characters').max(120).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Provide a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const googleSignInSchema = z.object({
  idToken: z.string().min(20, 'Missing Google credential'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>
