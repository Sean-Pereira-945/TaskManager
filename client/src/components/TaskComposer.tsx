import { type FormEvent, useEffect, useState } from 'react'

import type { Task, TaskPayload, TaskStatus } from '../types/task'
import { TASK_STATUSES } from '../types/task'

type TaskComposerProps = {
  mode: 'create' | 'edit'
  initialTask?: Task | null
  submitting: boolean
  onSubmit: (payload: TaskPayload) => Promise<void> | void
  onCancel?: () => void
}

type ComposerFormState = {
  title: string
  description: string
  status: TaskStatus
  dueDate: string
}

const createEmptyForm = (): ComposerFormState => ({
  title: '',
  description: '',
  status: 'TODO',
  dueDate: '',
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
})

const TaskComposer = ({ mode, initialTask, submitting, onSubmit, onCancel }: TaskComposerProps) => {
  const [formState, setFormState] = useState<ComposerFormState>(() => (initialTask ? toFormState(initialTask) : createEmptyForm()))
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setFormState(initialTask ? toFormState(initialTask) : createEmptyForm())
    setErrors({})
  }, [initialTask?.id])

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
    if (!validate()) return

    const normalizedDueDate = formState.dueDate ? new Date(formState.dueDate).toISOString() : null

    const payload: TaskPayload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
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
        <div>
          <p className="eyebrow">{mode === 'create' ? 'Add new task' : 'Edit task'}</p>
          <h2>{mode === 'create' ? 'Capture your next action' : 'Update the plan'}</h2>
        </div>
      </header>

      <label>
        <span>Title</span>
        <input
          type="text"
          placeholder="Design new onboarding flow"
          value={formState.title}
          onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
          disabled={submitting}
        />
        {errors.title && <small className="field-error">{errors.title}</small>}
      </label>

      <label>
        <span>Description</span>
        <textarea
          placeholder="Outline the steps, owners, and expected outcome."
          value={formState.description}
          onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          disabled={submitting}
          rows={4}
        />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </label>

      <label>
        <span>Due date (optional)</span>
        <input
          type="datetime-local"
          value={formState.dueDate}
          onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
          disabled={submitting}
        />
      </label>

      <label>
        <span>Status</span>
        <div className="segmented-control">
          {TASK_STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              className={status === formState.status ? 'active' : ''}
              onClick={() => setFormState((prev) => ({ ...prev, status }))}
              disabled={submitting}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </label>

      <div className="composer-actions">
        {mode === 'edit' && (
          <button type="button" className="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Add Task' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

export default TaskComposer
