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
  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  'CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id)',
  `CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, user_id)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members (user_id)',
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
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date)',
]

export const bootstrapDatabase = async () => {
  for (const statement of bootstrapStatements) {
    await db.query(statement)
  }
}
