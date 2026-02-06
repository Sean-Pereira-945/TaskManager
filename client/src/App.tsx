import { useEffect, useMemo, useState } from 'react'

import './App.css'
import { fetchCurrentUser, type AuthResponse } from './api/auth'
import { createTask, deleteTask, fetchTasks, updateTask } from './api/tasks'
import AuthPage from './components/AuthPage'
import TaskColumn from './components/TaskColumn'
import TaskComposer from './components/TaskComposer'
import { clearToken, getToken, setToken } from './lib/authToken'
import type { Task, TaskPayload, TaskQueryState, TaskStatus } from './types/task'
import { TASK_STATUSES } from './types/task'
import type { User } from './types/user'

const columnConfig: Record<Exclude<TaskStatus, never>, { title: string; accent: string; description: string }> = {
  TODO: {
    title: 'Backlog',
    accent: '#f97316',
    description: 'Ideas, requests, and open questions.',
  },
  IN_PROGRESS: {
    title: 'Building',
    accent: '#0ea5e9',
    description: 'Work that is actively being shipped.',
  },
  DONE: {
    title: 'Delivered',
    accent: '#10b981',
    description: 'Shipped outcomes ready for QA and launch.',
  },
}

const defaultQueryState: TaskQueryState = {
  status: 'ALL',
  search: '',
  sort: 'newest',
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskQueryState>(defaultQueryState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [refreshFlag, setRefreshFlag] = useState(0)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const resetSession = () => {
    clearToken()
    setCurrentUser(null)
    setTasks([])
    setEditingTask(null)
    setError(null)
    setFilters(defaultQueryState)
  }

  useEffect(() => {
    const hydrateSession = async () => {
      if (!getToken()) {
        setAuthLoading(false)
        return
      }

      try {
        const profile = await fetchCurrentUser()
        setCurrentUser(profile)
      } catch {
        resetSession()
      } finally {
        setAuthLoading(false)
      }
    }

    hydrateSession()
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadTasks = async () => {
      if (!currentUser) {
        setLoading(false)
        setTasks([])
        return
      }

      setLoading(true)
      try {
        const data = await fetchTasks(filters)
        if (!cancelled) {
          setTasks(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const status = (err as { status?: number }).status
          if (status === 401) {
            resetSession()
          } else {
            setError(err instanceof Error ? err.message : 'Unable to load tasks right now')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [filters, refreshFlag, currentUser])

  const refreshTasks = () => setRefreshFlag((prev) => prev + 1)

  const handleAuthSuccess = (payload: AuthResponse) => {
    setToken(payload.token)
    setCurrentUser(payload.user)
    setFilters(defaultQueryState)
    setError(null)
    refreshTasks()
  }

  const handleLogout = () => {
    resetSession()
  }

  const handleComposerSubmit = async (payload: TaskPayload) => {
    try {
      setSubmitting(true)
      setError(null)
      if (editingTask) {
        await updateTask(editingTask.id, payload)
        setEditingTask(null)
      } else {
        await createTask(payload)
      }
      refreshTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    const confirmation = window.confirm('Remove this task? You can\'t undo this action.')
    if (!confirmation) return
    try {
      await deleteTask(taskId)
      refreshTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete task')
    }
  }

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: nextStatus })
      refreshTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed')
    }
  }

  const visibleStatuses: TaskStatus[] =
    filters.status === 'ALL' ? TASK_STATUSES : [filters.status as TaskStatus]

  const board = useMemo(() => {
    return visibleStatuses.map((status) => ({
      status,
      config: columnConfig[status],
      items: tasks.filter((task) => task.status === status),
    }))
  }, [tasks, visibleStatuses])

  const heroStats = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'DONE').length
    return { total: tasks.length, done }
  }, [tasks])

  const resetComposer = () => setEditingTask(null)

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="banner info">Checking your workspace…</div>
      </div>
    )
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Global Trend · Task OS</p>
          <h1>Plan, build, and deliver without spreadsheets</h1>
          <p className="subtitle">
            Capture tasks, prioritize ruthlessly, and keep execution visible across the team.
          </p>
        </div>
        <dl className="hero-stats">
          <div>
            <dt>Open items</dt>
            <dd>{heroStats.total - heroStats.done}</dd>
          </div>
          <div>
            <dt>Shipped</dt>
            <dd>{heroStats.done}</dd>
          </div>
        </dl>
        <div className="session-panel">
          <div>
            <p className="session-name">{currentUser.name ?? currentUser.email}</p>
            <p className="session-email">{currentUser.email}</p>
          </div>
          <button type="button" className="ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="filters">
        <label>
          <span>Search</span>
          <input
            type="search"
            placeholder="Search by title or description"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </label>
        <label>
          <span>Sorting</span>
          <select value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value as TaskQueryState['sort'] }))}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Alphabetical</option>
          </select>
        </label>
        <div className="status-filter">
          <span>Focus</span>
          <div className="segmented-control compact">
            {['ALL', ...TASK_STATUSES].map((status) => (
              <button
                key={status}
                className={filters.status === status ? 'active' : ''}
                onClick={() => setFilters((prev) => ({ ...prev, status: status as TaskQueryState['status'] }))}
              >
                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <div className="banner error">{error}</div>}
      {loading && <div className="banner info">Syncing latest tasks…</div>}

      <div className="app-grid">
        <TaskComposer
          mode={editingTask ? 'edit' : 'create'}
          initialTask={editingTask}
          submitting={submitting}
          onSubmit={handleComposerSubmit}
          onCancel={resetComposer}
        />

        <div className="board">
          {board.map(({ status, config, items }) => (
            <TaskColumn
              key={status}
              title={config.title}
              accent={config.accent}
              description={config.description}
              tasks={items}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </div>

      {!loading && tasks.length === 0 && <p className="empty-state">No tasks yet. Create your first plan on the left.</p>}

      {editingTask && (
        <div className="banner muted">Editing “{editingTask.title}”</div>
      )}
    </div>
  )
}

export default App
