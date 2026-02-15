import { type CSSProperties, type ChangeEvent, useEffect, useState } from 'react'

import type { Task, TaskStatus } from '../types/task'

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => Promise<void> | void
  canMarkDone: boolean
  onCompletionBlocked?: () => void
}

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN PROGRESS',
  DONE: 'DONE',
}

const statusAccent: Record<TaskStatus, string> = {
  TODO: '#ff006e',
  IN_PROGRESS: '#ffd60a',
  DONE: '#06ffa5',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

const formatDueCountdown = (dueDate: string) => {
  const target = new Date(dueDate).getTime()
  if (Number.isNaN(target)) return null

  const diffMs = target - Date.now()
  const overdue = diffMs < 0
  const remaining = Math.abs(diffMs)
  const dayMs = 86_400_000
  const hourMs = 3_600_000
  const minuteMs = 60_000

  const days = Math.floor(remaining / dayMs)
  const hours = Math.floor((remaining % dayMs) / hourMs)
  const minutes = Math.floor((remaining % hourMs) / minuteMs)
  const seconds = Math.floor((remaining % minuteMs) / 1000)

  const pad = (value: number) => value.toString().padStart(2, '0')
  const label = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`

  return {
    overdue,
    label,
    exact: new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dueDate)),
  }
}

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, canMarkDone, onCompletionBlocked }: TaskCardProps) => {
  const [dueMeta, setDueMeta] = useState(() => (task.dueDate ? formatDueCountdown(task.dueDate) : null))

  useEffect(() => {
    if (!task.dueDate) {
      setDueMeta(null)
      return
    }

    const dueDate = task.dueDate
    const tick = () => setDueMeta(formatDueCountdown(dueDate))
    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [task.dueDate])

  const style = {
    '--task-accent': statusAccent[task.status],
  } as CSSProperties

  const countdownLabel = dueMeta ? dueMeta.label.split(' ').slice(0, 3).join(' ') : null

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as TaskStatus
    if (nextStatus === 'DONE' && !canMarkDone) {
      onCompletionBlocked?.()
      return
    }
    onStatusChange(task.id, nextStatus)
  }

  return (
    <article className="task-card" data-status={task.status} style={style}>
      <span className="task-status-badge">{statusLabels[task.status]}</span>
      <h3 className="task-title">{task.title}</h3>
      <p className="task-description">{task.description}</p>
      <div className="task-labels">
        <span className="task-project-pill">{task.project.name}</span>
        <span className="task-assignee-pill">{task.assignee ? task.assignee.name ?? task.assignee.email : 'Unassigned'}</span>
      </div>

      <div className="task-meta">
        {task.dueDate ? (
          <div className="task-due">
            {dueMeta && (
              <span className={`overdue ${dueMeta.overdue ? 'active' : ''}`}>
                {dueMeta.overdue ? `⚠ Overdue by ${countdownLabel}` : `Due in ${countdownLabel}`}
              </span>
            )}
            <span className="task-due-date">
              {dueMeta?.exact ?? new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(task.dueDate))}
            </span>
          </div>
        ) : (
          <div className="task-due task-due--empty">No due date set</div>
        )}
        <div className="task-created">Created: {formatDate(task.createdAt)}</div>
        {task.completedAt && (
          <div className="task-created">Completed: {new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(task.completedAt))}</div>
        )}
      </div>

      <div className="task-actions">
        <button type="button" className="task-btn" onClick={() => onEdit(task)}>
          Edit
        </button>
        <label className="status-select">
          <span>Update status</span>
          <select value={task.status} onChange={handleStatusChange}>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          {!canMarkDone && <small>Only owners can mark tasks as done.</small>}
        </label>
      </div>

      <button type="button" className="remove-btn" onClick={() => onDelete(task.id)}>
        Remove
      </button>
    </article>
  )
}

export default TaskCard
