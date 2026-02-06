import { apiRequest } from '../lib/apiClient'
import type { User } from '../types/user'

export type AuthResponse = {
  token: string
  user: User
}

type RegisterPayload = {
  email: string
  password: string
  name?: string
}

type LoginPayload = {
  email: string
  password: string
}

export const registerAccount = (payload: RegisterPayload) => {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export const loginAccount = (payload: LoginPayload) => {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export const googleSignIn = (idToken: string) => {
  return apiRequest<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: { idToken },
  })
}

export const fetchCurrentUser = () => {
  return apiRequest<User>('/api/auth/me')
}
