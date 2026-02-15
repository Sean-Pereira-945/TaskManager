import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import './App.css'
import { fetchCurrentUser, type AuthResponse } from './api/auth'
import { addProjectMember, createProject, deleteProject as apiDeleteProject, fetchProjectMembers, fetchProjects, removeProjectMember } from './api/projects'
import { createTask, deleteTask, fetchTasks, updateTask } from './api/tasks'
import AuthPage from './components/AuthPage'
import TaskColumn from './components/TaskColumn'
import TaskComposer from './components/TaskComposer'
import ProjectProgressModal from './components/ProjectProgressModal'
import ProjectSelect from './components/ProjectSelect'
import SortDropdown from './components/SortDropdown'
import { clearToken, getToken, setToken } from './lib/authToken'
import type { Task, TaskPayload, TaskQueryState, TaskStatus } from './types/task'
import { TASK_STATUSES } from './types/task'
import type { Project, ProjectMember } from './types/project'
import type { User } from './types/user'

const columnConfig: Record<Exclude<TaskStatus, never>, {
  title: string
  accent: string
  description: string
  icon: string
  variant: 'backlog' | 'building' | 'delivered'
}> = {
  TODO: {
    title: 'Backlog',
    accent: '#ff006e',
    description: 'Ideas, requests, and open questions.',
    icon: '◢',
    variant: 'backlog',
  },
  IN_PROGRESS: {
    title: 'Building',
    accent: '#ffd60a',
    description: 'Work that is actively being shipped.',
    icon: '⚡',
    variant: 'building',
  },
  DONE: {
    title: 'Delivered',
    accent: '#06ffa5',
    description: 'Shipped outcomes ready for QA and launch.',
    icon: '✓',
    variant: 'delivered',
  },
}

type BoardSectionId = 'composer' | TaskStatus

const createDefaultQueryState = (): TaskQueryState => ({
  status: 'ALL',
  search: '',
  sort: 'newest',
  projectId: null,
})

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskQueryState>(() => createDefaultQueryState())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [refreshFlag, setRefreshFlag] = useState(0)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<BoardSectionId | null>('composer')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '' })
  const [projectSubmitting, setProjectSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressTasks, setProgressTasks] = useState<Task[]>([])
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)

  const resetSession = () => {
    clearToken()
    setCurrentUser(null)
    setTasks([])
    setEditingTask(null)
    setError(null)
    setFilters(createDefaultQueryState())
    setProjects([])
    setSelectedProjectId(null)
    setProjectMembers([])
    setProjectError(null)
    setMemberError(null)
    setInviteEmail('')
    setNewProject({ name: '', description: '' })
    setProjectFormOpen(false)
    setProgressOpen(false)
    setProgressTasks([])
    setProgressLoading(false)
    setProgressError(null)
  }

  const hydrateProjects = useCallback(async () => {
    if (!currentUser) {
      return
    }

    setProjectsLoading(true)
    try {
      const data = await fetchProjects()
      setProjects(data)
      setProjectError(null)
      setSelectedProjectId((prev) => {
        if (prev && data.some((project) => project.id === prev)) {
          return prev
        }
        return data[0]?.id ?? null
      })
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Unable to sync projects right now')
    } finally {
      setProjectsLoading(false)
    }
  }, [currentUser])

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
    if (!currentUser) {
      setProjects([])
      setSelectedProjectId(null)
      return
    }

    hydrateProjects()
  }, [currentUser, hydrateProjects])

  useEffect(() => {
    if (!currentUser || !selectedProjectId) {
      setProjectMembers([])
      setMemberError(null)
      return
    }

    let cancelled = false
    setMemberError(null)
    setProjectMembers([])

    const loadMembers = async () => {
      setMembersLoading(true)
      try {
        const members = await fetchProjectMembers(selectedProjectId)
        if (!cancelled) {
          setProjectMembers(members)
          setMemberError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setMemberError(err instanceof Error ? err.message : 'Unable to load project members')
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false)
        }
      }
    }

    loadMembers()

    return () => {
      cancelled = true
    }
  }, [currentUser, selectedProjectId])

  useEffect(() => {
    let cancelled = false

    const loadTasks = async () => {
      if (!currentUser || !filters.projectId) {
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

  useEffect(() => {
    setFilters((prev) => {
      if (prev.projectId === selectedProjectId) {
        return prev
      }
      return { ...prev, projectId: selectedProjectId }
    })
  }, [selectedProjectId])

  const refreshTasks = () => setRefreshFlag((prev) => prev + 1)

  const handleAuthSuccess = (payload: AuthResponse) => {
    setToken(payload.token)
    setCurrentUser(payload.user)
    setFilters(createDefaultQueryState())
    setSelectedProjectId(null)
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

  const handleProjectCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newProject.name.trim()) {
      setProjectError('Name your project to continue')
      return
    }

    try {
      setProjectSubmitting(true)
      const project = await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim() ? newProject.description.trim() : null,
      })
      setProjects((prev) => [project, ...prev.filter((existing) => existing.id !== project.id)])
      setSelectedProjectId(project.id)
      setNewProject({ name: '', description: '' })
      setProjectFormOpen(false)
      setProjectError(null)
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Unable to create project right now')
    } finally {
      setProjectSubmitting(false)
    }
  }

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedProjectId) {
      return
    }
    if (!inviteEmail.trim()) {
      setMemberError('Add a teammate email first')
      return
    }

    try {
      setInviteSubmitting(true)
      const member = await addProjectMember(selectedProjectId, inviteEmail.trim())
      setProjectMembers((prev) => {
        if (prev.some((existing) => existing.userId === member.userId)) {
          return prev
        }
        return [...prev, member]
      })
      setInviteEmail('')
      setMemberError(null)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Unable to add teammate right now')
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!selectedProjectId) {
      return
    }
    const confirmed = window.confirm(`Remove ${member.email} from this project?`)
    if (!confirmed) {
      return
    }
    try {
      await removeProjectMember(selectedProjectId, member.userId)
      setProjectMembers((prev) => prev.filter((current) => current.userId !== member.userId))
      setMemberError(null)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Unable to remove teammate right now')
    }
  }

  const handleDeleteProject = async () => {
    if (!selectedProjectId || !activeProject) {
      return
    }
    const confirmed = window.confirm(`Delete project "${activeProject.name}"? This removes all tasks inside it.`)
    if (!confirmed) {
      return
    }
    try {
      await apiDeleteProject(selectedProjectId)
      setProjects((prev) => prev.filter((project) => project.id !== selectedProjectId))
      setSelectedProjectId(null)
      setProjectMembers([])
      setProjectError(null)
      setProgressOpen(false)
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Unable to delete project right now')
    }
  }

  const handleDelete = async (taskId: string) => {
    const confirmation = window.confirm('Remove this task? You can\'t undo this action.')
    if (!confirmation) return
    try {
      await deleteTask(taskId)
      if (editingTask?.id === taskId) {
        setEditingTask(null)
      }
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

  const handleCompletionBlocked = () => {
    setError('Only project owners can mark tasks as done. Please request owner approval.')
  }

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const canInviteMembers = activeProject?.role === 'owner'
  const showProjectForm = projectFormOpen || projects.length === 0
  const isProjectOwner = activeProject?.role === 'owner'

  const handleProgressOpen = async () => {
    if (!selectedProjectId) {
      return
    }
    setProgressOpen(true)
    setProgressTasks([])
    setProgressLoading(true)
    try {
      const data = await fetchTasks({ status: 'ALL', search: '', sort: 'newest', projectId: selectedProjectId })
      setProgressTasks(data)
      setProgressError(null)
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : 'Unable to load project insights')
    } finally {
      setProgressLoading(false)
    }
  }

  const handleProgressClose = () => {
    setProgressOpen(false)
    setProgressError(null)
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

  useEffect(() => {
    if (!filters.search.trim()) {
      return
    }
    const firstWithMatches = board.find((section) => section.items.length > 0)
    if (firstWithMatches && expandedSection !== firstWithMatches.status) {
      setExpandedSection(firstWithMatches.status)
    }
  }, [filters.search, board, expandedSection])

  const heroStats = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'DONE').length
    return { total: tasks.length, done }
  }, [tasks])

  const resetComposer = () => setEditingTask(null)
  const toggleSection = (section: BoardSectionId) => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }
  const composerExpanded = expandedSection === 'composer'

  const renderShell = (content: ReactNode) => (
    <div className="cyber-shell">
      <div className="cyber-bg" aria-hidden />
      <div className="orb orb-1" aria-hidden />
      <div className="orb orb-2" aria-hidden />
      <div className="orb orb-3" aria-hidden />
      <div className="scanlines" aria-hidden />
      <div className="cyber-container">{content}</div>
    </div>
  )

  if (authLoading) {
    return renderShell(
      <div className="banner info glass">Checking your workspace…</div>
    )
  }

  if (!currentUser) {
    return renderShell(<AuthPage onAuthSuccess={handleAuthSuccess} />)
  }

  return renderShell(
    <>
      <header className="cyber-header">
        <div className="header-top">
          <p className="header-label">◢ NEON PULSE · TASK MANAGER ◣</p>
          <div className="user-info">
            <div className="user-meta">
              <p className="user-name">{currentUser.name ?? currentUser.email}</p>
              <p className="user-email">{currentUser.email}</p>
            </div>
            <button type="button" className="sign-out" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
        <h1 className="title">Plan, build, and deliver</h1>
        <p className="subtitle">Capture tasks, prioritize ruthlessly, and keep execution visible across the team.</p>
        <div className="stats">
          <div className="stat-card">
            <p className="stat-label">◢ Open Items</p>
            <p className="stat-value">{heroStats.total - heroStats.done}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">◢ Shipped</p>
            <p className="stat-value">{heroStats.done}</p>
          </div>
        </div>
      </header>

      <section className="project-panel glass">
        <div className="project-panel__header">
          <div className="project-panel__header-left">
            <p className="section-label">◢ ACTIVE PROJECT</p>
            {projects.length ? (
              <ProjectSelect
                projects={projects}
                value={selectedProjectId}
                disabled={projectsLoading}
                onChange={(nextId) => setSelectedProjectId(nextId)}
              />
            ) : (
              <p className="project-panel__empty">Create a project to unlock your workspace.</p>
            )}
          </div>
          {projects.length > 0 && (
            <button
              type="button"
              className="project-toggle"
              onClick={() => setProjectFormOpen((prev) => !prev)}
            >
              {showProjectForm ? 'Close builder' : 'New project'}
            </button>
          )}
        </div>

        {projectError && <div className="banner error glass">{projectError}</div>}
        {projectsLoading && <div className="banner info glass">Syncing projects…</div>}

        {showProjectForm && (
          <form className="project-form" onSubmit={handleProjectCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                type="text"
                placeholder="Launch campaign"
                value={newProject.name}
                onChange={(event) => setNewProject((prev) => ({ ...prev, name: event.target.value }))}
                disabled={projectSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                placeholder="Give your teammates context."
                value={newProject.description}
                onChange={(event) => setNewProject((prev) => ({ ...prev, description: event.target.value }))}
                disabled={projectSubmitting}
                rows={3}
              />
            </div>
            <button type="submit" className="add-task-btn" disabled={projectSubmitting || !newProject.name.trim()}>
              {projectSubmitting ? 'Creating…' : 'Save project'}
            </button>
          </form>
        )}

        {activeProject ? (
          <>
            <div className="project-panel__meta">
              <div>
                <div className="project-panel__title-row">
                  <p className="project-panel__title">{activeProject.name}</p>
                  <button
                    type="button"
                    className="project-progress-btn"
                    onClick={handleProgressOpen}
                    disabled={!selectedProjectId || progressLoading}
                  >
                    Progress
                  </button>
                    {isProjectOwner && (
                      <button type="button" className="project-delete-btn" onClick={handleDeleteProject}>
                        Delete project
                      </button>
                    )}
                </div>
                <p className="project-panel__description">
                  {activeProject.description ?? 'No description yet.'}
                </p>
              </div>
              <span className={`role-pill role-${activeProject.role}`}>
                {activeProject.role === 'owner' ? 'Owner' : 'Member'}
              </span>
            </div>

            <div className="project-members-card">
              <div className="project-members-card__header">
                <p className="section-label">◢ TEAM</p>
                {canInviteMembers && (
                  <form className="invite-form" onSubmit={handleInviteSubmit}>
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      disabled={inviteSubmitting}
                    />
                    <button type="submit" disabled={inviteSubmitting || !inviteEmail.trim()}>
                      {inviteSubmitting ? 'Inviting…' : 'Invite'}
                    </button>
                  </form>
                )}
              </div>
              {memberError && <small className="field-error">{memberError}</small>}
              {membersLoading ? (
                <p className="project-members__empty">Syncing members…</p>
              ) : projectMembers.length ? (
                <ul className="member-chips">
                  {projectMembers.map((member) => (
                    <li key={member.id} className="member-chip">
                      <div className="member-chip__info">
                        <span className="member-name">{member.name ?? member.email}</span>
                        <span className="member-email">{member.email}</span>
                        <span className="member-role">
                          {member.userId === currentUser.id ? 'You' : member.role === 'owner' ? 'Owner' : 'Member'}
                        </span>
                      </div>
                      {isProjectOwner && member.userId !== currentUser.id && member.role !== 'owner' && (
                        <button
                          type="button"
                          className="member-remove-btn"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="project-members__empty">No teammates yet.</p>
              )}
            </div>
          </>
        ) : (
          <p className="project-panel__empty">Create your first project to start planning.</p>
        )}
      </section>

      <section className="controls">
        <div className="search-box">
          <input
            type="search"
            placeholder="◢ Search anything..."
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </div>
        <SortDropdown
          value={filters.sort}
          onChange={(nextSort) => setFilters((prev) => ({ ...prev, sort: nextSort }))}
        />
        <div className="filter-buttons" role="group" aria-label="Filter by status">
          {['ALL', ...TASK_STATUSES].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-btn ${filters.status === status ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, status: status as TaskQueryState['status'] }))}
            >
              {status === 'ALL' ? 'ALL' : status === 'IN_PROGRESS' ? 'IN PROGRESS' : status}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="banner error glass">{error}</div>}
      {loading && <div className="banner info glass">Syncing latest tasks…</div>}

      <div className="task-grid">
        <section className={`task-section section-new ${composerExpanded ? 'expanded' : 'collapsed'} in-view`}>
          <button
            type="button"
            className="section-toggle"
            onClick={() => toggleSection('composer')}
            aria-expanded={composerExpanded}
          >
            <div className="section-bar">
              <div className="section-bar-left">
                <div className="section-bar-icon">+</div>
                <div className="section-header">
                  <p className="section-label">◢ ADD NEW TASK</p>
                  <p className="section-title">Capture your next action</p>
                </div>
              </div>
              <div className="section-bar-right">
                {editingTask && <span className="section-count">Editing</span>}
              </div>
            </div>
          </button>
          {composerExpanded && (
            <div className="section-content">
              <TaskComposer
                mode={editingTask ? 'edit' : 'create'}
                initialTask={editingTask}
                submitting={submitting}
                onSubmit={handleComposerSubmit}
                onCancel={resetComposer}
                projectId={selectedProjectId}
                projectName={activeProject?.name}
                members={projectMembers}
                membersLoading={membersLoading}
                canDelete={Boolean(editingTask && activeProject?.role === 'owner')}
                onDeleteTask={editingTask && activeProject?.role === 'owner' ? () => handleDelete(editingTask.id) : undefined}
              />
            </div>
          )}
        </section>

        {board.map(({ status, config, items }) => (
          <TaskColumn
            key={status}
            title={config.title}
            accent={config.accent}
            description={config.description}
            icon={config.icon}
            variant={config.variant}
            tasks={items}
            onEdit={(task) => {
              setEditingTask(task)
              setExpandedSection('composer')
            }}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            isExpanded={expandedSection === status}
            onToggle={() => toggleSection(status)}
            canMarkDone={isProjectOwner}
            onCompletionBlocked={handleCompletionBlocked}
          />
        ))}
      </div>

      {!loading && tasks.length === 0 && (
        <p className="empty-state">No tasks yet. Capture your first move above.</p>
      )}

      {editingTask && (
        <div className="banner muted glass">Editing “{editingTask.title}”</div>
      )}

      <ProjectProgressModal
        open={progressOpen}
        onClose={handleProgressClose}
        projectName={activeProject?.name ?? 'Project'}
        tasks={progressTasks}
        loading={progressLoading}
        error={progressError}
      />
    </>
  )
}

export default App
