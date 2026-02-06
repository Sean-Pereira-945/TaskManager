export type AuthUser = {
  id: string
  email: string
  name: string | null
}

export type UserRow = {
  id: string
  email: string
  password_hash: string | null
  name: string | null
  provider: 'local' | 'google'
  provider_id: string | null
  created_at: Date
  updated_at: Date
}
