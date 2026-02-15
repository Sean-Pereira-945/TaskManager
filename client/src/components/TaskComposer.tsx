import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'

import type { ProjectMember } from '../types/project'
import type { Task, TaskPayload, TaskStatus } from '../types/task'

type TaskComposerProps = {
  mode: 'create' | 'edit'
  initialTask?: Task | null
  submitting: boolean
  onSubmit: (payload: TaskPayload) => Promise<void> | void
  onCancel?: () => void
  projectId: string | null
  projectName?: string
  members: ProjectMember[]
  membersLoading?: boolean
  canDelete?: boolean
  onDeleteTask?: () => Promise<void> | void
}

type ComposerFormState = {
  title: string
  description: string
  status: TaskStatus
  dueDate: string
  assigneeId: string
}

const createEmptyForm = (): ComposerFormState => ({
  title: '',
  description: '',
  status: 'TODO',
  dueDate: '',
  assigneeId: '',
})

const errorMessages = {
  title: 'Add a descriptive title (min 3 characters)',
  description: 'Describe the task so teammates know what to do',
}

type FormErrors = Partial<Record<'title' | 'description', string>>

const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISO = new Date(date.getTime() - tzOffset).toISOString()
  return localISO.slice(0, 16)
}

const toFormState = (task: Task): ComposerFormState => ({
  title: task.title,
  description: task.description,
  status: task.status,
  dueDate: toLocalInputValue(task.dueDate),
  assigneeId: task.assignee?.id ?? '',
})

const TaskComposer = ({
  mode,
  initialTask,
  submitting,
  onSubmit,
  onCancel,
  projectId,
  projectName,
  members,
  membersLoading,
  canDelete,
  onDeleteTask,
}: TaskComposerProps) => {
  const [formState, setFormState] = useState<ComposerFormState>(() => (initialTask ? toFormState(initialTask) : createEmptyForm()))
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setFormState(initialTask ? toFormState(initialTask) : createEmptyForm())
    setErrors({})
  }, [initialTask?.id])

  const composerDisabled = submitting || !projectId

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (formState.title.trim().length < 3) {
      nextErrors.title = errorMessages.title
    }
    if (formState.description.trim().length < 8) {
      nextErrors.description = errorMessages.description
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!projectId || !validate()) return

    const normalizedDueDate = formState.dueDate ? new Date(formState.dueDate).toISOString() : null

    const payload: TaskPayload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      projectId,
      assigneeId: formState.assigneeId ? formState.assigneeId : null,
      dueDate: normalizedDueDate,
    }

    await onSubmit(payload)
    if (mode === 'create') {
      setFormState(createEmptyForm())
    }
  }

  return (
    <form className="task-composer" onSubmit={handleSubmit}>
      <header className="task-composer__header">
        <p className="eyebrow">{mode === 'create' ? 'Add new task' : 'Edit task'}</p>
        <h2>{mode === 'create' ? 'Capture your next action' : 'Update the plan'}</h2>
        {projectName && <p className="composer-project">Inside {projectName}</p>}
      </header>

      {!projectId && (
        <div className="banner info glass">Select a project before adding tasks.</div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="composer-title">
          Title
        </label>
        <input
          id="composer-title"
          className="form-input"
          type="text"
          placeholder="Design new onboarding flow"
          value={formState.title}
          onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
          disabled={composerDisabled}
        />
        {errors.title && <small className="field-error">{errors.title}</small>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="composer-description">
          Description
        </label>
        <textarea
          id="composer-description"
          className="form-input"
          placeholder="Outline the steps, owners, and expected outcome."
          value={formState.description}
          onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          disabled={composerDisabled}
          rows={4}
        />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="composer-due-date">
          Due date (optional)
        </label>
        <input
          id="composer-due-date"
          className="form-input"
          type="datetime-local"
          value={formState.dueDate}
          onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
          disabled={composerDisabled}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Status</span>
        <div className="status-selector">
          {(['TODO', 'IN_PROGRESS'] as TaskStatus[]).map((status) => {
            const style = {
              '--status-accent': status === 'TODO' ? '#00f7ff' : '#8338ec',
            } as CSSProperties

            return (
              <button
                type="button"
                key={status}
                className={`status-option ${status === formState.status ? 'selected' : ''}`}
                style={style}
                onClick={() => setFormState((prev) => ({ ...prev, status }))}
                disabled={composerDisabled}
              >
                {status === 'IN_PROGRESS' ? 'IN PROGRESS' : status}
              </button>
            )
          })}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="composer-assignee">
          Assign to
        </label>
        <select
          id="composer-assignee"
          className="form-input"
          value={formState.assigneeId}
          onChange={(event) => setFormState((prev) => ({ ...prev, assigneeId: event.target.value }))}
          disabled={composerDisabled || membersLoading || members.length === 0}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name ?? member.email}
              {member.role === 'owner' ? ' · Owner' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="composer-actions">
        {mode === 'edit' && canDelete && onDeleteTask && (
          <button type="button" className="composer-delete-btn" onClick={() => onDeleteTask()} disabled={submitting}>
            Delete task
          </button>
        )}
        {mode === 'edit' && (
          <button type="button" className="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="submit" className="add-task-btn" disabled={composerDisabled}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Add Task' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

export default TaskComposer
