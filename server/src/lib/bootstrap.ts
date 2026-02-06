import { db } from './db'

const bootstrapStatements = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)',
  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'TODO',
    user_id UUID,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id)',
]

export const bootstrapDatabase = async () => {
  for (const statement of bootstrapStatements) {
    await db.query(statement)
  }
}
